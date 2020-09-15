module Twitter.User exposing
    ( User
    , decoder
    )

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required)
import Url exposing (Url)
import Util exposing (urlDecoder)


type alias User =
    { id : String
    , username : String
    , profileImageUrl : Url
    , profileUrl : String
    , verified : Bool
    }


decoder : Decoder User
decoder =
    Decode.succeed User
        |> required "id" Decode.string
        |> required "username" Decode.string
        |> required "profile_image_url" urlDecoder
        |> required "url" Decode.string
        |> required "verified" Decode.bool
