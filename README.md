# New Year's Eve Countdown 🎆🎉

Welcome to the **New Year's Eve Countdown**! This project provides a beautiful countdown to the upcoming new year, complete with animated effects such as fireworks and confetti when the countdown reaches zero. This is perfect for adding a little extra excitement to your New Year’s Eve celebrations! 

## Features

- **Responsive Design**: The countdown looks great on both desktop and mobile devices, adjusting to various screen sizes.
- **Dynamic Countdown**: Shows days, hours, minutes, and seconds remaining until the new year.
- **Handwritten Snake Digits**: Every digit is a handwritten stroke that behaves like a snake. When a digit changes, the snake is pulled out of the old digit where its stroke ended, swings out in a random direction and writes the new one. Each digit has four handwritten variants that are picked at random.
- **Fireworks and Confetti**: Automatically triggered once the countdown reaches zero.
- **Language Support**: Detects the user’s locale and switches between English and German.

## Preview

<a href="https://bacherik.github.io/silvester-countdown/">![Screenshot of the Countdown](https://github.com/user-attachments/assets/f03da4e0-3fe0-4313-a20d-e013cbfef28e)</a>


## How to Run the Project

1. **Clone the repository**:
   ```bash
   git clone https://github.com/BachErik/silvester-countdown.git
   ```

2. **Open the countdown**:
   Open `index.html` in your web browser.

## Handwritten Digits

The digits in `numbers/<digit>/<variant>.svg` were drawn in Excalidraw. Those exports are filled outlines, so `tools/extract_centerlines.py` recovers each stroke's centerline and writing direction and writes them to `numbers/glyphs.js`. Re-run it after changing or adding SVGs:

```bash
python3 tools/extract_centerlines.py   # needs numpy
```

## Localization

The countdown automatically detects the browser's language settings and switches between English and German. If the browser's language is set to German, it will display "Silvester Countdown" and use the appropriate labels for the time segments (Tage, Stunden, Minuten, Sekunden).

## Contribution

Feel free to fork the repository and submit pull requests with improvements or bug fixes. All contributions are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

Let me know if there’s anything else you’d like to add!
