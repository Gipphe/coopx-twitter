port module Main exposing (main)

import API
import API.String512 as String512
import Browser exposing (Document, UrlRequest)
import Browser.Navigation exposing (Key)
import Element as El exposing (Element)
import Element.Border as Border
import Element.Font as Font
import Element.Input as Input
import Element.Region as Region
import Http exposing (Error(..))
import Json.Decode as D exposing (Decoder)
import Json.Encode exposing (Value)
import List.LimitedList as LimitedList exposing (LimitedList)
import Positive
import RemoteData exposing (RemoteData(..), WebData)
import Task
import Time exposing (Month(..), Posix, Zone)
import Tuple
import Twitter.AddRule exposing (AddRule)
import Twitter.RuleWithID exposing (RuleID, RuleWithID)
import Twitter.Tweet as Tweet exposing (Tweet)
import Twitter.User exposing (User)
import Url exposing (Url)
import View.Button as Button
import View.Color as Color
import View.Misc as Misc


type ModelStates
    = InvalidConfig Value D.Error
    | AwaitingTimeZone (Config {})
    | WebsocketDown String
    | Valid Model


type alias Config r =
    { r
        | key : Key
        , url : Url
        , flags : Flags
    }


type alias Model =
    { key : Key
    , url : Url
    , flags : Flags
    , timeZone : Zone
    , ruleInput : String
    , stream : LimitedList Tweet
    , lastMessage : RemoteData D.Error PortResponse
    , ruleResponse : WebData RuleMsg
    , currentRules : WebData (List RuleWithID)
    , socketState : SocketState
    }


type PortResponse
    = NewTweet Tweet
    | Waiting Posix
    | Socket SocketState


type SocketState
    = Closed
    | Open


type Msg
    = OnUrlRequest UrlRequest
    | OnUrlChange Url
    | ReceivedMessage String
    | GotTimeZone Zone
    | WebsocketIssue String
    | RuleInput String
    | SubmitRule
    | RuleAdded (WebData RuleWithID)
    | GotCurrentRules (WebData (List RuleWithID))
    | DropRule RuleID
    | RuleDeleted (WebData RuleID)


type RuleMsg
    = RuleWasAdded
    | RuleWasDeleted


type alias Flags =
    { apiBaseUrl : String
    }


portResponseDecoder : Decoder PortResponse
portResponseDecoder =
    D.field "tag" D.string
        |> D.andThen
            (\tag ->
                case tag of
                    "tweet" ->
                        D.map NewTweet Tweet.decoder

                    "waiting" ->
                        D.field "until" D.int
                            |> D.map Time.millisToPosix
                            |> D.map Waiting

                    "socket" ->
                        D.field "event" D.string
                            |> D.andThen
                                (\s ->
                                    case s of
                                        "open" ->
                                            D.succeed Open

                                        "closed" ->
                                            D.succeed Closed

                                        _ ->
                                            D.fail <| "Unrecognized socket state: " ++ s
                                )
                            |> D.map Socket

                    _ ->
                        D.fail <| "Unrecognized tag: " ++ tag
            )


flagsDecoder : Decoder Flags
flagsDecoder =
    D.map Flags <| D.field "apiBaseUrl" D.string



-- Program


main : Program Value ModelStates Msg
main =
    Browser.application
        { init = init
        , view = view
        , update = update
        , subscriptions = subscriptions
        , onUrlRequest = OnUrlRequest
        , onUrlChange = OnUrlChange
        }



-- Init


init : Value -> Url -> Key -> ( ModelStates, Cmd Msg )
init flags url key =
    case D.decodeValue flagsDecoder flags of
        Ok f ->
            ( AwaitingTimeZone
                { key = key
                , url = url
                , flags = f
                }
            , Task.perform GotTimeZone Time.here
            )

        Err e ->
            ( InvalidConfig flags e
            , Cmd.none
            )



-- Update


update : Msg -> ModelStates -> ( ModelStates, Cmd Msg )
update msg modelStatus =
    case ( msg, modelStatus ) of
        ( WebsocketIssue reason, _ ) ->
            ( WebsocketDown reason
            , Cmd.none
            )

        ( _, Valid model ) ->
            Tuple.mapFirst Valid <| updateValid msg model

        ( _, AwaitingTimeZone config ) ->
            case msg of
                GotTimeZone tz ->
                    ( Valid
                        { key = config.key
                        , flags = config.flags
                        , url = config.url
                        , timeZone = tz
                        , ruleInput = ""
                        , stream = LimitedList.empty Positive.tweetLimit
                        , lastMessage = Loading
                        , currentRules = Loading
                        , ruleResponse = NotAsked
                        , socketState = Open
                        }
                    , API.getRules config.flags GotCurrentRules
                    )

                _ ->
                    ( modelStatus
                    , Cmd.none
                    )

        ( _, InvalidConfig _ _ ) ->
            ( modelStatus, Cmd.none )

        ( _, _ ) ->
            ( modelStatus, Cmd.none )


updateValid : Msg -> Model -> ( Model, Cmd Msg )
updateValid msg model =
    case msg of
        ReceivedMessage message ->
            let
                resp =
                    D.decodeString portResponseDecoder message
            in
            case resp of
                Ok portResp ->
                    case portResp of
                        NewTweet tweet ->
                            ( { model
                                | stream = LimitedList.cons tweet model.stream
                                , lastMessage = RemoteData.fromResult resp
                              }
                            , Cmd.none
                            )

                        Waiting _ ->
                            ( { model
                                | lastMessage = RemoteData.fromResult resp
                              }
                            , Cmd.none
                            )

                        Socket state ->
                            ( { model
                                | socketState = state
                              }
                            , Cmd.none
                            )

                Err _ ->
                    ( { model | lastMessage = RemoteData.fromResult resp }
                    , Cmd.none
                    )

        DropRule ruleID ->
            ( { model | ruleResponse = Loading }
            , API.deleteRule model.flags RuleDeleted ruleID
            )

        OnUrlChange url ->
            ( { model | url = url }
            , Cmd.none
            )

        OnUrlRequest _ ->
            ( model
            , Cmd.none
            )

        RuleAdded resp ->
            ( { model
                | ruleResponse = RemoteData.map (\_ -> RuleWasAdded) resp
                , currentRules =
                    case resp of
                        Success newRule ->
                            RemoteData.map ((::) newRule) model.currentRules

                        _ ->
                            model.currentRules
              }
            , Cmd.none
            )

        RuleDeleted resp ->
            let
                newRules =
                    case resp of
                        Success deletedId ->
                            RemoteData.map
                                (List.filter (.id >> (/=) deletedId))
                                model.currentRules

                        _ ->
                            model.currentRules
            in
            ( { model
                | ruleResponse = RemoteData.map (\_ -> RuleWasDeleted) resp
                , currentRules = newRules
              }
            , Cmd.none
            )

        RuleInput input ->
            ( { model
                | ruleInput = input
              }
            , Cmd.none
            )

        GotCurrentRules currentRules ->
            ( { model
                | currentRules = currentRules
              }
            , Cmd.none
            )

        SubmitRule ->
            case String512.fromString model.ruleInput of
                Nothing ->
                    ( model
                    , Cmd.none
                    )

                Just ss ->
                    ( { model | ruleInput = "" }
                    , API.addRule
                        model.flags
                        RuleAdded
                      <|
                        AddRule ss Nothing
                    )

        GotTimeZone tz ->
            ( { model
                | timeZone = tz
              }
            , Cmd.none
            )

        WebsocketIssue _ ->
            ( model, Cmd.none )



-- Subscriptions


subscriptions : ModelStates -> Sub Msg
subscriptions _ =
    Sub.batch
        [ messageReceiver ReceivedMessage
        , websocketIssue WebsocketIssue
        ]


port messageReceiver : (String -> msg) -> Sub msg


port websocketIssue : (String -> msg) -> Sub msg



-- View


view : ModelStates -> Document Msg
view modelStatus =
    case modelStatus of
        InvalidConfig _ e ->
            { title = "Twitter stream"
            , body =
                [ El.layout [] <| El.text <| D.errorToString e ]
            }

        AwaitingTimeZone _ ->
            { title = "Twitter stream"
            , body =
                [ El.layout [] <| El.text "Awaiting time zone..."
                ]
            }

        WebsocketDown reason ->
            { title = "Twitter stream"
            , body =
                [ El.layout
                    []
                  <|
                    El.text <|
                        "Issue establishing a connection to the websocket server: "
                            ++ reason
                ]
            }

        Valid model ->
            viewValid model


viewValid : Model -> Document Msg
viewValid model =
    { title = "Twitter stream"
    , body =
        [ El.layout
            [ Font.color Color.primaryText
            , Font.family
                [ Font.typeface "Segoe UI"
                , Font.typeface "Roboto"
                , Font.sansSerif
                ]
            ]
          <|
            El.el
                [ El.centerX
                , El.width (El.px 600)
                , Region.mainContent
                ]
            <|
                El.column
                    [ El.padding 14
                    ]
                    [ viewTopBar model
                    , Misc.verticalSeparator
                    , viewRules model.currentRules
                    , Misc.verticalSeparator
                    , viewStatuses model
                    , viewStream model.timeZone model.stream
                    ]
        ]
    }


viewStatuses : Model -> Element msg
viewStatuses model =
    El.column
        [ El.spacing 10, El.paddingXY 0 10 ]
        [ viewLastMessage model
        , viewRuleResponse model.ruleResponse
        ]


viewRuleResponse : WebData RuleMsg -> Element msg
viewRuleResponse ruleResponse =
    case ruleResponse of
        NotAsked ->
            El.none

        Loading ->
            El.text "Loading..."

        Failure e ->
            El.text <| "Error while adding/removing rule: " ++ formatHttpError e

        Success _ ->
            El.none


viewRules : WebData (List RuleWithID) -> Element Msg
viewRules res =
    El.row
        [ El.spacing 12, El.paddingXY 0 10 ]
    <|
        [ El.text "Current filtering rules:"
        ]
            ++ (case res of
                    NotAsked ->
                        [ El.text "Initializing..."
                        ]

                    Loading ->
                        [ El.text "Fetching current rules..."
                        ]

                    Failure e ->
                        [ El.text <| formatHttpError e
                        ]

                    Success rules ->
                        List.map viewRule rules
                            |> List.intersperse Misc.horizontalSeparator
               )


viewRule : RuleWithID -> Element Msg
viewRule rule =
    El.row
        [ El.spacing 5 ]
        [ El.text <| String512.toString rule.rule.value
        , Button.destructive
            [ El.padding 5
            , El.height <| El.px 30
            , El.width <| El.px 30
            , Region.description "Remove rule"
            ]
            { onPress = Just (DropRule rule.id)
            , label = El.el [ El.centerX, El.centerY ] (El.text "X")
            }
        ]


viewStream : Zone -> LimitedList Tweet -> Element Msg
viewStream tz tweetList =
    let
        stream =
            LimitedList.toList tweetList
    in
    case stream of
        [] ->
            El.text "No tweets yet..."

        tweets ->
            viewTweets tz tweets


viewTopBar : Model -> Element Msg
viewTopBar model =
    El.row
        [ El.spacing 50 ]
        [ El.el
            [ Region.heading 1
            ]
          <|
            El.text "Twitter stream"
        , Misc.horizontalSeparator
        , ruleInput model.ruleInput
        ]


ruleInput : String -> Element Msg
ruleInput currentValue =
    El.row
        [ El.spacing 10
        , El.paddingXY 0 5
        ]
        [ Input.search
            [ El.width (El.fill |> El.minimum 100 |> El.maximum 400)
            ]
            { onChange = RuleInput
            , text = currentValue
            , placeholder = Just <| Input.placeholder [] <| El.text "#cats"
            , label = Input.labelLeft [] <| El.text "Add rule"
            }
        , submitRuleButton currentValue
        ]


submitRuleButton : String -> Element Msg
submitRuleButton str =
    if String.isEmpty str then
        Button.disabledButton
            [ Region.description "Rule input field must not be empty to submit a rule"
            ]
            (El.text "Add new filter rule")

    else
        Button.submitButton []
            { onPress = Just SubmitRule
            , label = El.text "Add new filter rule"
            }


viewLastMessage : Model -> Element msg
viewLastMessage model =
    case model.lastMessage of
        Success (Waiting until) ->
            El.text <| "Throttled by Twitter API. Waiting until " ++ formatTime model.timeZone until

        Failure err ->
            El.el [] <|
                El.text <|
                    "Unable to interpret the previous message received: "
                        ++ D.errorToString err

        _ ->
            El.text " "


viewTweets : Zone -> List Tweet -> Element Msg
viewTweets tz tweets =
    El.column
        []
        (List.indexedMap (viewTweet tz) tweets)


viewTweet : Zone -> Int -> Tweet -> Element msg
viewTweet tz idx tweet =
    El.row
        [ El.spacing 10
        , El.padding 10
        , Border.solid
        , Border.widthEach
            { top =
                if idx == 0 then
                    1

                else
                    0
            , left = 1
            , right = 1
            , bottom = 1
            }
        , Border.color Color.primaryText
        ]
        [ viewProfilePicture tweet.author.profileImageUrl
        , El.column [ El.spacing 10, El.width El.fill ]
            [ El.row [ El.spacing 20 ]
                [ viewTweetTime tz tweet.createdAt
                , viewUsername tweet.author
                ]
            , viewTweetText tweet.text
            ]
        ]


viewProfilePicture : Url -> Element msg
viewProfilePicture url =
    El.image
        [ El.alignTop
        , El.width (El.px 48)
        , El.height (El.px 48)
        ]
        { src = Url.toString url
        , description = "User profile picture"
        }


viewUsername : User -> Element msg
viewUsername { profileUrl, username } =
    El.link
        [ Font.color Color.username ]
        { url = profileUrl
        , label = El.text username
        }


viewTweetTime : Zone -> Posix -> Element msg
viewTweetTime tz time =
    formatTime tz time
        |> El.text
        |> El.el []


viewTweetText : String -> Element msg
viewTweetText text =
    El.paragraph [] [ El.text text ]


formatTime : Zone -> Posix -> String
formatTime tz time =
    [ Time.toHour tz time
    , Time.toMinute tz time
    , Time.toSecond tz time
    ]
        |> List.map (String.fromInt >> String.padLeft 2 '0')
        |> String.join ":"


formatHttpError : Http.Error -> String
formatHttpError e =
    case e of
        BadUrl url ->
            "Invalid or malformed URL: " ++ url

        Timeout ->
            "Network request timed out"

        NetworkError ->
            "An unknown network error occurred"

        BadStatus status ->
            "Received a non-OK status: " ++ String.fromInt status

        BadBody reason ->
            "Received unexpected body structure: " ++ reason
