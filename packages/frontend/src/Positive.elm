module Positive exposing
    ( Positive
    , fromInt
    , toInt
    , tweetLimit
    )


type Positive
    = Positive Int


fromInt : Int -> Maybe Positive
fromInt x =
    if x >= 0 then
        Just (Positive x)

    else
        Nothing


toInt : Positive -> Int
toInt (Positive x) =
    x


tweetLimit : Positive
tweetLimit =
    Positive 20
