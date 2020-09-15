module List.LimitedList exposing
    ( LimitedList
    , cons
    , empty
    , singleton
    , toList
    )

import List
import Positive exposing (Positive)


type LimitedList a
    = LimitedList
        { limit : Positive
        , items : List a
        }


empty : Positive -> LimitedList a
empty limit =
    LimitedList
        { limit = limit
        , items = []
        }


singleton : Positive -> a -> LimitedList a
singleton limit item =
    LimitedList
        { limit = limit
        , items = List.singleton item
        }


cons : a -> LimitedList a -> LimitedList a
cons x (LimitedList { items, limit }) =
    LimitedList
        { limit = limit
        , items = List.take (Positive.toInt limit) <| x :: items
        }


toList : LimitedList a -> List a
toList (LimitedList { items }) =
    items
