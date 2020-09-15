module View.Button exposing
    ( buttonShape
    , destructive
    , disabledButton
    , submitButton
    )

import Element as El exposing (Attribute, Element)
import Element.Background as Background
import Element.Border as Border
import Element.Font as Font
import Element.Input as Input
import View.Color as Color


type alias ButtonOpts msg =
    { onPress : Maybe msg
    , label : Element msg
    }


submitButton : List (Attribute msg) -> ButtonOpts msg -> Element msg
submitButton attrs c =
    Input.button
        (buttonShape
            ++ [ El.mouseOver
                    [ Background.color Color.primaryHover
                    ]
               , Background.color Color.primary
               ]
            ++ attrs
        )
        c


destructive : List (Attribute msg) -> ButtonOpts msg -> Element msg
destructive attrs c =
    Input.button
        (buttonShape
            ++ [ El.mouseOver
                    [ Background.color Color.destructiveBackground
                    ]
               , Font.color Color.destructiveText
               ]
            ++ attrs
        )
        c


disabledButton : List (Attribute msg) -> Element msg -> Element msg
disabledButton attrs label =
    El.el
        (buttonShape
            ++ Background.color Color.faded
            :: attrs
        )
        label


buttonShape : List (Attribute msg)
buttonShape =
    [ El.paddingXY 20 10
    , Border.rounded 9999
    , Font.color Color.white
    ]
