module View.Color exposing
    ( black
    , destructiveBackground
    , destructiveText
    , faded
    , primary
    , primaryHover
    , primaryText
    , username
    , white
    )

import Element as El exposing (Color)


primary : Color
primary =
    El.rgb255 26 145 218


primaryText : Color
primaryText =
    El.rgb255 41 60 75


primaryHover : Color
primaryHover =
    El.rgb255 29 161 242


destructiveText : Color
destructiveText =
    El.rgb255 224 36 94


destructiveBackground : Color
destructiveBackground =
    El.rgba255 224 36 94 0.1


faded : Color
faded =
    El.rgba255 122 122 122 0.5


white : Color
white =
    El.rgb255 255 255 255


black : Color
black =
    El.rgb255 0 0 0


username : Color
username =
    El.rgb255 0 0 255
