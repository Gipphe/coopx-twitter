module NonEmpty exposing
    ( NonEmpty
    , decoder
    , encode
    , head
    , nonEmpty
    , singleton
    , toList
    )

import Json.Decode as Decode exposing (Decoder)
import Json.Encode as Encode exposing (Value)


type NonEmpty a
    = NonEmpty a (List a)


singleton : a -> NonEmpty a
singleton x =
    NonEmpty x []


nonEmpty : List a -> Maybe (NonEmpty a)
nonEmpty xs =
    case xs of
        x :: rest ->
            Just <| NonEmpty x rest

        [] ->
            Nothing


toList : NonEmpty a -> List a
toList (NonEmpty x xs) =
    x :: xs


encode : (a -> Value) -> NonEmpty a -> Value
encode decodeValue (NonEmpty x xs) =
    Encode.list decodeValue (x :: xs)


decoder : Decoder a -> Decoder (NonEmpty a)
decoder decodeValue =
    Decode.list decodeValue
        |> Decode.andThen
            (\xs ->
                case nonEmpty xs of
                    Nothing ->
                        Decode.fail "List is empty"

                    Just nxs ->
                        Decode.succeed nxs
            )


head : NonEmpty a -> a
head (NonEmpty x _) =
    x
