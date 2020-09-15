module Twitter.RuleWithID exposing
    ( RuleID
    , RuleWithID
    , decoder
    , encode
    )

import API.String512 as String512
import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required)
import Json.Encode as Encode exposing (Value)
import List
import Tuple exposing (pair)
import Twitter.AddRule as AddRule exposing (AddRule)


type alias RuleID =
    String


type alias RuleWithID =
    { rule : AddRule
    , id : RuleID
    }


encode : RuleWithID -> Value
encode rr =
    Encode.object <|
        [ ( "id", Encode.string rr.id )
        , ( "value", String512.encode rr.rule.value )
        ]
            ++ Maybe.withDefault []
                (Maybe.map
                    (Encode.string >> pair "tag" >> List.singleton)
                    rr.rule.tag
                )


decoder : Decoder RuleWithID
decoder =
    AddRule.decoder
        |> Decode.andThen
            (\ar ->
                Decode.succeed (RuleWithID ar)
                    |> required "id" Decode.string
            )
