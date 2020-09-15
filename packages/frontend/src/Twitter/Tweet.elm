module Twitter.Tweet exposing
    ( Tweet
    , decoder
    )

import Iso8601
import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline as P
import Time exposing (Posix)
import Twitter.User as User exposing (User)
import Util exposing (listFind)


type alias Tweet =
    { id : String
    , text : String
    , createdAt : Posix
    , author : User
    }


decoder : Decoder Tweet
decoder =
    let
        resolveTweetWithAuthor id text createdAt author_id users =
            let
                maybeAuthor =
                    listFind ((==) author_id << .id) users
            in
            case maybeAuthor of
                Nothing ->
                    Decode.fail "Did not find author in included users"

                Just author ->
                    Decode.succeed
                        { id = id
                        , text = text
                        , createdAt = createdAt
                        , author = author
                        }
    in
    Decode.field "data"
        (Decode.succeed resolveTweetWithAuthor
            |> P.requiredAt [ "data", "id" ] Decode.string
            |> P.requiredAt [ "data", "text" ] Decode.string
            |> P.requiredAt [ "data", "created_at" ] Iso8601.decoder
            |> P.requiredAt [ "data", "author_id" ] Decode.string
            |> P.requiredAt [ "includes", "users" ] (Decode.list User.decoder)
            |> P.resolve
        )
