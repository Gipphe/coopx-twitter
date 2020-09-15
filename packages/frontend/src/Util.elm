module Util exposing
    ( listFind
    , urlDecoder
    )

import Json.Decode as Decode exposing (Decoder)
import Maybe
import Url exposing (Url)


listFind : (a -> Bool) -> List a -> Maybe a
listFind f list =
    case list of
        [] ->
            Nothing

        x :: xs ->
            if f x then
                Just x

            else
                listFind f xs


urlDecoder : Decoder Url
urlDecoder =
    Decode.string
        |> Decode.andThen
            (Url.fromString
                >> Maybe.map Decode.succeed
                >> Maybe.withDefault (Decode.fail "Passed string is not a valid Url")
            )
