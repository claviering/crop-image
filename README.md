# crop image using canvas

## Idea

1. load image and render it to canvas and set it to the buttom of the layout
2. draw a Cover
3. draw crop rectangle with the ratio and clean the rectangle style
4. draw BorderCircles
5. set the cursor to pointer when mouse move over the rectangle
6. drag the rectangle
7. fix #6 BUG, it will jump to the first postion for beginning when drag the rectangle
8. the mouse will be default to pointer when dragging the rectangle
9. set mouse when cursor is in the renderBorderCirclor
10. reszie the rectangle

![GIF](./docs/ScreenRecording.gif)

## screenshot

![screenshot](./docs/screenshot.png)

## Try It Online

[Demo](https://stackblitz.com/edit/weiye-crop-image?embed=1&file=index.html)

## Options

| option  | describe                         |
| ------- | -------------------------------- |
| width   | canvas width                     |
| height  | canvas height                    |
| ratio   | crop rectangle ratio             |
| padding | padding between canvas and image |

## ratio == 0

It can crop for any size

![screenshot](https://s1.ax1x.com/2022/06/06/XwI4ED.png)
