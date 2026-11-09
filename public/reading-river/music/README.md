# Reading River music

## Current soundtrack: Vltava

- Composition: Bedřich Smetana, *Vltava* (The Moldau), the second symphonic poem from *Má vlast*.
- Performance credit: Musopen Symphony Orchestra. The original Ogg metadata also identifies the Czech National Symphony Orchestra.
- Source and licence: [Wikimedia Commons file page](https://commons.wikimedia.org/wiki/File:Smetana,_M%C3%A1_vlast_-_Vltava_-_The_Moldau.ogg), which lists this recording under the [CC0 1.0 public-domain dedication](https://creativecommons.org/publicdomain/zero/1.0/).
- Original audio: <https://upload.wikimedia.org/wikipedia/commons/3/39/Smetana%2C_M%C3%A1_vlast_-_Vltava_-_The_Moldau.ogg>
- Related release notes from the recording project: [Musopen Kickstarter Project #1](https://musopen.org/nl/blog/musopen-kickstarter-project-1-complete/).

`vltava.m4a` contains the full 12-minute, 51-second performance, encoded as 96 kbps AAC, 48 kHz stereo, with MP4 fast-start metadata. The current source is Peter’s supplied Ogg file, byte-for-byte identical to the Commons original (SHA-256 `84663550a99ba8f7069cd58e0c3fcc1ca143f5ed4c6121da76f3fecd64a9f067`).

The quiet opening originally measured −45.4 LUFS after whole-piece normalization and was hard to hear under the river. FFmpeg now uses `highpass=f=35,dynaudnorm=f=500:g=31:p=0.8:m=20:r=0.1` before two-pass loudness normalization targeting −21 LUFS, −4 dBTP and 9 LU of loudness range. The first 30 seconds now measure −21.5 LUFS with a −7.7 dBTP true peak. Playback begins within the first tap/key event so browsers with strict autoplay rules receive the user gesture. Existing fades and the sound toggle still apply.

SHA-256 of `vltava.m4a`:

```text
f7953949ebfd40a5d4fb6b9cfb25d51e9188c091ee367ee5be82e933f7548f84
```

`blue-danube.m4a` is retained for the older demo capture recipes; the live scene's source now points to `vltava.m4a`. The music credit appears on the How It Works page.
