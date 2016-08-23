# TV Media

An electron app for playing back media, stored on a networked server, on the TV. Designed to work with [this](https://github.com/Ap0c/video-server) video server, and run on the Raspberry Pi (2 and above).

## To Run

Install the node dependencies:

```
npm install
```

and the `cec-utils` package to allow control from a tv remote:

```
sudo apt-get install cec-utils
```

then run with:

```
npm start
```
