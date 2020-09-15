module Twitter.TweetSpec exposing (tests)

import Expect
import Json.Decode as D
import Test exposing (Test)
import Time
import Twitter.Tweet as Tweet exposing (Tweet)
import Url


tests : Test
tests =
    Test.describe "Tweet"
        [ Test.describe "decoder"
            [ Test.test "parses example" <|
                \_ ->
                    Expect.equal
                        (D.decodeString Tweet.decoder example)
                        (Ok exampleTweet)
            ]
        ]


example : String
example =
    "{\"tag\": \"tweets\", \"data\": {\"data\":{\"text\":\"tweet text\",\"id\":\"tweetid\",\"source\":\"Twitter Web App\",\"author_id\":\"authorid\",\"created_at\":\"2020-09-13T18:19:44.000Z\"},\"includes\":{\"users\":[{\"created_at\":\"2020-03-07T10:35:51.000Z\",\"profile_image_url\":\"https://profile.image.host/some/profile/image/path.jpg\",\"verified\":false,\"url\":\"https://some.profile.url/username\",\"username\":\"someuser\",\"id\":\"authorid\"},]}}}"


exampleTweet : Tweet
exampleTweet =
    { id = "tweetid"
    , text = "tweet text"
    , createdAt = Time.millisToPosix 1600021184000
    , author =
        { id = "authorid"
        , username = "someuser"
        , profileImageUrl =
            { protocol = Url.Https
            , host = "profile.image.host"
            , port_ = Nothing
            , path = "/some/profile/image/path.jpg"
            , query = Nothing
            , fragment = Nothing
            }
        , profileUrl = "https://some.profile.url/username"
        , verified = False
        }
    }
