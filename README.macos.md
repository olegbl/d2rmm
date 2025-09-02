# Experimental support for macOS (and maybe Linux)

1. Clone this repo: `git clone git@github.com:olegbl/d2rmm.git`
1. Use Node v18, e.g. using [`fnm`](https://github.com/Schniz/fnm)
1. Install `yarn` via `npm install -g yarn`
1. `yarn install`
    NOTE: You'll probably get an error along the lines of what's shown below but that's most likely ok. Just proceed to the next step.
    ```
    Error: node-gyp failed to rebuild '.../d2rmm/release/app/node_modules/ref-napi'.
    For more information, rerun with the DEBUG environment variable set to "electron-rebuild".
    Error: `make` failed with exit code: 2
    ```
1. `yarn start`
1. Use D2RMM as usual
1. Run D2R from CrossOver with the following run options: `-mod D2RMM -txt`

If you have issues with the `CascLib.dylib` file, you may have to compile `CascLib` yourself:

```sh
mv tools/CascLib.dylib tools/CascLib.dylib.bkp
cd node_modules/CascLib
cmake -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON
cmake --build build
cp build/casc.framework/Versions/1.0.0/casc ../../tools/CascLib.dylib
```
