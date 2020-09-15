module View.Misc exposing
    ( horizontalSeparator
    , verticalSeparator
    )

import Element as El exposing (Element)
import Element.Border as Border
import View.Color as Color


horizontalSeparator : Element msg
horizontalSeparator =
    El.el
        [ El.height El.fill
        , Border.solid
        , Border.widthEach
            { left = 1
            , bottom = 0
            , right = 0
            , top = 0
            }
        , Border.color Color.black
        ]
        El.none


verticalSeparator : Element msg
verticalSeparator =
    El.el
        [ El.width El.fill
        , Border.solid
        , Border.widthEach
            { top = 1
            , bottom = 0
            , left = 0
            , right = 0
            }
        , Border.color Color.black
        ]
        El.none
