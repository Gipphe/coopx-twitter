module Twitter.AddRule exposing
    ( AddRule
    , decoder
    , encode
    )

import API.String512 as String512 exposing (String512)
import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (optional, required)
import Json.Encode as Encode exposing (Value)
import Tuple exposing (pair)


type alias AddRule =
    { value : String512
    , tag : Maybe String
    }


encode : AddRule -> Value
encode x =
    Encode.object <|
        [ ( "value", Encode.string (String512.toString x.value) )
        ]
            ++ Maybe.withDefault
                []
                (Maybe.map
                    (List.singleton << pair "tag" << Encode.string)
                    x.tag
                )


decoder : Decoder AddRule
decoder =
    Decode.succeed AddRule
        |> required "value" String512.decoder
        |> optional "tag" (Decode.maybe Decode.string) Nothing
