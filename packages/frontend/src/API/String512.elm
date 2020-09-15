module API.String512 exposing
    ( String512
    , decoder
    , encode
    , fromString
    , toString
    )

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode exposing (Value)
import String


type String512
    = String512 String


fromString : String -> Maybe String512
fromString s =
    if String.length s > 512 || String.isEmpty s then
        Nothing

    else
        Just <| String512 s


toString : String512 -> String
toString (String512 x) =
    x


encode : String512 -> Value
encode (String512 x) =
    Encode.string x


decoder : Decoder String512
decoder =
    Decode.string
        |> Decode.andThen
            (\s ->
                case fromString s of
                    Nothing ->
                        Decode.fail
                            "String value is not a valid String512 value"

                    Just x ->
                        Decode.succeed x
            )
