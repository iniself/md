const OUT_HTML_CSS = `
                :root {
                  --background: 0 0% 100%;
                  --foreground: 0 0% 3.9%;

                  --card: 0 0% 100%;
                  --card-foreground: 0 0% 3.9%;

                  --popover: 0 0% 100%;
                  --popover-foreground: 0 0% 3.9%;

                  --primary: 0 0% 9%;
                  --primary-foreground: 0 0% 98%;

                  --secondary: 0 0% 96.1%;
                  --secondary-foreground: 0 0% 9%;

                  --muted: 0 0% 96.1%;
                  --muted-foreground: 0 0% 45.1%;

                  --accent: 0 0% 96.1%;
                  --accent-foreground: 0 0% 9%;

                  --destructive: 0 84.2% 60.2%;
                  --destructive-foreground: 0 0% 98%;

                  --border: 0 0% 89.8%;
                  --input: 0 0% 89.8%;
                  --ring: 0 0% 3.9%;
                  --radius: 0.5rem;

                  --blockquote-background: #f7f7f7;
                }

                .dark {
                  --background: 0 0% 3.9%;
                  --foreground: 0 0% 98%;

                  --card: 0 0% 3.9%;
                  --card-foreground: 0 0% 98%;

                  --popover: 0 0% 3.9%;
                  --popover-foreground: 0 0% 98%;

                  --primary: 0 0% 98%;
                  --primary-foreground: 0 0% 9%;

                  --secondary: 0 0% 14.9%;
                  --secondary-foreground: 0 0% 98%;

                  --muted: 0 0% 14.9%;
                  --muted-foreground: 0 0% 63.9%;

                  --accent: 0 0% 14.9%;
                  --accent-foreground: 0 0% 98%;

                  --destructive: 0 62.8% 30.6%;
                  --destructive-foreground: 0 0% 98%;

                  --border: 0 0% 14.9%;
                  --input: 0 0% 14.9%;
                  --ring: 0 0% 83.1%;

                  --blockquote-background: #212121;
                }

                /* tailwind base css  */
                *,
                :after,
                :before {
                  --tw-border-spacing-x: 0;
                  --tw-border-spacing-y: 0;
                  --tw-translate-x: 0;
                  --tw-translate-y: 0;
                  --tw-rotate: 0;
                  --tw-skew-x: 0;
                  --tw-skew-y: 0;
                  --tw-scale-x: 1;
                  --tw-scale-y: 1;
                  --tw-pan-x: ;
                  --tw-pan-y: ;
                  --tw-pinch-zoom: ;
                  --tw-scroll-snap-strictness: proximity;
                  --tw-gradient-from-position: ;
                  --tw-gradient-via-position: ;
                  --tw-gradient-to-position: ;
                  --tw-ordinal: ;
                  --tw-slashed-zero: ;
                  --tw-numeric-figure: ;
                  --tw-numeric-spacing: ;
                  --tw-numeric-fraction: ;
                  --tw-ring-inset: ;
                  --tw-ring-offset-width: 0px;
                  --tw-ring-offset-color: #fff;
                  --tw-ring-color: rgba(59, 130, 246, 0.5);
                  --tw-ring-offset-shadow: 0 0 #0000;
                  --tw-ring-shadow: 0 0 #0000;
                  --tw-shadow: 0 0 #0000;
                  --tw-shadow-colored: 0 0 #0000;
                  --tw-blur: ;
                  --tw-brightness: ;
                  --tw-contrast: ;
                  --tw-grayscale: ;
                  --tw-hue-rotate: ;
                  --tw-invert: ;
                  --tw-saturate: ;
                  --tw-sepia: ;
                  --tw-drop-shadow: ;
                  --tw-backdrop-blur: ;
                  --tw-backdrop-brightness: ;
                  --tw-backdrop-contrast: ;
                  --tw-backdrop-grayscale: ;
                  --tw-backdrop-hue-rotate: ;
                  --tw-backdrop-invert: ;
                  --tw-backdrop-opacity: ;
                  --tw-backdrop-saturate: ;
                  --tw-backdrop-sepia: ;
                  --tw-contain-size: ;
                  --tw-contain-layout: ;
                  --tw-contain-paint: ;
                  --tw-contain-style: ;
                }
                ::backdrop {
                  --tw-border-spacing-x: 0;
                  --tw-border-spacing-y: 0;
                  --tw-translate-x: 0;
                  --tw-translate-y: 0;
                  --tw-rotate: 0;
                  --tw-skew-x: 0;
                  --tw-skew-y: 0;
                  --tw-scale-x: 1;
                  --tw-scale-y: 1;
                  --tw-pan-x: ;
                  --tw-pan-y: ;
                  --tw-pinch-zoom: ;
                  --tw-scroll-snap-strictness: proximity;
                  --tw-gradient-from-position: ;
                  --tw-gradient-via-position: ;
                  --tw-gradient-to-position: ;
                  --tw-ordinal: ;
                  --tw-slashed-zero: ;
                  --tw-numeric-figure: ;
                  --tw-numeric-spacing: ;
                  --tw-numeric-fraction: ;
                  --tw-ring-inset: ;
                  --tw-ring-offset-width: 0px;
                  --tw-ring-offset-color: #fff;
                  --tw-ring-color: rgba(59, 130, 246, 0.5);
                  --tw-ring-offset-shadow: 0 0 #0000;
                  --tw-ring-shadow: 0 0 #0000;
                  --tw-shadow: 0 0 #0000;
                  --tw-shadow-colored: 0 0 #0000;
                  --tw-blur: ;
                  --tw-brightness: ;
                  --tw-contrast: ;
                  --tw-grayscale: ;
                  --tw-hue-rotate: ;
                  --tw-invert: ;
                  --tw-saturate: ;
                  --tw-sepia: ;
                  --tw-drop-shadow: ;
                  --tw-backdrop-blur: ;
                  --tw-backdrop-brightness: ;
                  --tw-backdrop-contrast: ;
                  --tw-backdrop-grayscale: ;
                  --tw-backdrop-hue-rotate: ;
                  --tw-backdrop-invert: ;
                  --tw-backdrop-opacity: ;
                  --tw-backdrop-saturate: ;
                  --tw-backdrop-sepia: ;
                  --tw-contain-size: ;
                  --tw-contain-layout: ;
                  --tw-contain-paint: ;
                  --tw-contain-style: ;
                } /*! tailwindcss v3.4.17 | MIT License | https://tailwindcss.com*/
                *,
                :after,
                :before {
                  box-sizing: border-box;
                  border: 0 solid #e5e7eb;
                }
                :after,
                :before {
                  --tw-content: "";
                }
                :host,
                html {
                  line-height: 1.5;
                  -webkit-text-size-adjust: 100%;
                  -moz-tab-size: 4;
                  -o-tab-size: 4;
                  tab-size: 4;
                  font-family:
                    ui-sans-serif,
                    system-ui,
                    sans-serif,
                    Apple Color Emoji,
                    Segoe UI Emoji,
                    Segoe UI Symbol,
                    Noto Color Emoji;
                  font-feature-settings: normal;
                  font-variation-settings: normal;
                  -webkit-tap-highlight-color: transparent;
                }
                hr {
                  height: 0;
                  color: inherit;
                  border-top-width: 1px;
                }
                abbr:where([title]) {
                  -webkit-text-decoration: underline dotted;
                  text-decoration: underline dotted;
                }
                h1,
                h2,
                h3,
                h4,
                h5,
                h6 {
                  font-size: inherit;
                  font-weight: inherit;
                }
                a {
                  color: inherit;
                  text-decoration: inherit;
                }
                b,
                strong {
                  font-weight: bolder;
                }
                code,
                kbd,
                pre,
                samp {
                  font-family:
                    ui-monospace,
                    SFMono-Regular,
                    Menlo,
                    Monaco,
                    Consolas,
                    Liberation Mono,
                    Courier New,
                    monospace;
                  font-feature-settings: normal;
                  font-variation-settings: normal;
                  font-size: 1em;
                }
                small {
                  font-size: 80%;
                }
                sub,
                sup {
                  font-size: 75%;
                  line-height: 0;
                  position: relative;
                  vertical-align: baseline;
                }
                sub {
                  bottom: -0.25em;
                }
                sup {
                  top: -0.5em;
                }
                table {
                  text-indent: 0;
                  border-color: inherit;
                  border-collapse: collapse;
                }
                button,
                input,
                optgroup,
                select,
                textarea {
                  font-family: inherit;
                  font-feature-settings: inherit;
                  font-variation-settings: inherit;
                  font-size: 100%;
                  font-weight: inherit;
                  line-height: inherit;
                  letter-spacing: inherit;
                  color: inherit;
                  margin: 0;
                  padding: 0;
                }
                button,
                select {
                  text-transform: none;
                }
                button,
                input:where([type="button"]),
                input:where([type="reset"]),
                input:where([type="submit"]) {
                  -webkit-appearance: button;
                  background-color: transparent;
                  background-image: none;
                }
                :-moz-focusring {
                  outline: auto;
                }
                :-moz-ui-invalid {
                  box-shadow: none;
                }
                progress {
                  vertical-align: baseline;
                }
                ::-webkit-inner-spin-button,
                ::-webkit-outer-spin-button {
                  height: auto;
                }
                [type="search"] {
                  -webkit-appearance: textfield;
                  outline-offset: -2px;
                }
                ::-webkit-search-decoration {
                  -webkit-appearance: none;
                }
                ::-webkit-file-upload-button {
                  -webkit-appearance: button;
                  font: inherit;
                }
                summary {
                  display: list-item;
                }
                blockquote,
                dd,
                dl,
                figure,
                h1,
                h2,
                h3,
                h4,
                h5,
                h6,
                hr,
                p,
                pre {
                  margin: 0;
                  overflow-wrap: break-word;
                  hyphens: auto;
                }
                fieldset {
                  margin: 0;
                }
                fieldset,
                legend {
                  padding: 0;
                }
                menu,
                ol,
                ul {
                  list-style: none;
                  margin: 0;
                  padding: 0;
                }
                dialog {
                  padding: 0;
                }
                textarea {
                  resize: vertical;
                }
                input::-moz-placeholder,
                textarea::-moz-placeholder {
                  opacity: 1;
                  color: #9ca3af;
                }
                input::placeholder,
                textarea::placeholder {
                  opacity: 1;
                  color: #9ca3af;
                }
                [role="button"],
                button {
                  cursor: pointer;
                }
                :disabled {
                  cursor: default;
                }
                audio,
                canvas,
                embed,
                iframe,
                img,
                object,
                svg,
                video {
                  display: block;
                  vertical-align: middle;
                }
                img,
                video {
                  max-width: 100%;
                  height: auto;
                }
                [hidden]:where(:not([hidden="until-found"])) {
                  display: none;
                }


                /* 全局 body 样式，使用变量 */
                body {
                  background-color: hsl(var(--background));
                  color: hsl(var(--foreground));
                  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
                    "Helvetica Neue", Arial, sans-serif;
                  margin: 0;
                  padding: 0;
                }
                body {
                    margin: 0 auto;
                    padding: 1rem;
                  }
                  @media (min-width: 768px) {
                    body {
                    max-width: 80ch;
                    margin: 0 auto;
                    }
                  }
                  @media print {
                    * {
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                    }
                  }
                  blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre {
                    margin: 0
                  }
                  #theme-toggle {
                      position: fixed;
                      top: 20px;
                      right: 20px;
                      width: 56px;
                      height: 28px;
                      border-radius: 999px;
                      border: none;
                      cursor: pointer;
                      background: #e5e7eb;
                      transition: background 0.3s ease;
                      display: flex;
                      align-items: center;
                      padding: 4px;
                  }

                  #theme-toggle::before {
                      content: "";
                      width: 20px;
                      height: 20px;
                      border-radius: 50%;
                      background: white;
                      transition: transform 0.3s ease;
                      transform: translateX(0);
                  }

                  html.dark #theme-toggle {
                      background: #374151;
                  }

                  html.dark #theme-toggle::before {
                      transform: translateX(28px);
                  }

                  #theme-toggle .icon {
                      position: absolute;
                      font-size: 12px;
                      pointer-events: none;
                  }

                  #theme-toggle .sun {
                      left: 6px;
                  }

                  #theme-toggle .moon {
                      right: 6px;
                  }`

export default OUT_HTML_CSS
