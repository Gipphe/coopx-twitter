module API.RulesEndpoint exposing (rulesEndpoint)

import Url.Builder exposing (absolute)


rulesEndpoint : String
rulesEndpoint =
    absolute [ "2", "tweets", "search", "stream", "rules" ] []
