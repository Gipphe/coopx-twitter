module API exposing
    ( addRule
    , addRules
    , deleteRule
    , deleteRules
    , getRules
    )

import API.RulesEndpoint exposing (rulesEndpoint)
import Http
import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode exposing (Value)
import NonEmpty exposing (NonEmpty)
import RemoteData exposing (WebData)
import String
import Twitter.AddRule as AddRule exposing (AddRule)
import Twitter.RuleWithID as RuleWithID exposing (RuleID, RuleWithID)



-- Config


type alias HttpConfig r =
    { r
        | rulesUrl : String
    }


prependBaseUrl : HttpConfig r -> String -> String
prependBaseUrl conf =
    let
        baseUrl =
            conf.rulesUrl
    in
    if String.endsWith "/" baseUrl then
        (++) <| String.dropRight 1 baseUrl

    else
        (++) baseUrl



-- JSON encoders/decoders


addRuleResponseDecoder : Decoder (NonEmpty RuleWithID)
addRuleResponseDecoder =
    Decode.field "data"
        (NonEmpty.decoder RuleWithID.decoder)


getRulesResponseDecoder : Decoder (List RuleWithID)
getRulesResponseDecoder =
    Decode.field "data" (Decode.list RuleWithID.decoder)
        |> Decode.maybe
        |> Decode.map (Maybe.withDefault [])


encodeAddRules : NonEmpty AddRule -> Value
encodeAddRules v =
    Encode.object
        [ ( "add", Encode.list AddRule.encode (NonEmpty.toList v) )
        ]


encodeDeleteRules : NonEmpty RuleID -> Value
encodeDeleteRules v =
    Encode.object
        [ ( "delete"
          , Encode.object
                [ ( "ids", NonEmpty.encode Encode.string v )
                ]
          )
        ]



-- API


getRules : HttpConfig r -> (WebData (List RuleWithID) -> msg) -> Cmd msg
getRules conf mkMsg =
    Http.get
        { url = prependBaseUrl conf <| rulesEndpoint
        , expect =
            Http.expectJson
                (RemoteData.fromResult >> mkMsg)
                getRulesResponseDecoder
        }


addRule : HttpConfig r -> (WebData RuleWithID -> msg) -> AddRule -> Cmd msg
addRule conf mkMsg rule =
    addRules
        conf
        (RemoteData.map NonEmpty.head >> mkMsg)
        (NonEmpty.singleton rule)


addRules :
    HttpConfig r
    -> (WebData (NonEmpty RuleWithID) -> msg)
    -> NonEmpty AddRule
    -> Cmd msg
addRules conf mkMsg rules =
    Http.post
        { url = prependBaseUrl conf <| rulesEndpoint
        , body = Http.jsonBody (encodeAddRules rules)
        , expect =
            Http.expectJson
                (RemoteData.fromResult >> mkMsg)
                addRuleResponseDecoder
        }


deleteRules :
    HttpConfig r
    -> (WebData (NonEmpty RuleID) -> msg)
    -> NonEmpty RuleID
    -> Cmd msg
deleteRules conf mkMsg rules =
    Http.post
        { url = prependBaseUrl conf <| rulesEndpoint
        , body = Http.jsonBody (encodeDeleteRules rules)
        , expect =
            Http.expectWhatever
                (RemoteData.fromResult >> RemoteData.map (always rules) >> mkMsg)
        }


deleteRule : HttpConfig r -> (WebData RuleID -> msg) -> RuleID -> Cmd msg
deleteRule conf mkMsg rule =
    deleteRules conf (RemoteData.map NonEmpty.head >> mkMsg) (NonEmpty.singleton rule)
