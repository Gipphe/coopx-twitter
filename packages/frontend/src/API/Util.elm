module API.Util exposing (toQuery)

import List
import String


toQuery : (a -> String) -> List a -> String
toQuery toString xs =
    List.map toString xs
        |> String.join ","
