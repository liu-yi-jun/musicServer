var express = require('express');
var router = express.Router();
var db = require('../db/db');
let util = require('../util/util')
var fs = require("fs");
var baseUrl = require('../config/config').resource.baseUrl;

let react = {
  // string number
  // fret number
  // finger 0, 1, 2, 3, 4, 5
  // strings number(isRequired)
  // lite bool

  // defaultProps = {
  //   fret: 0,
  //   lite: false
  // }
  dot(
    string,
    fret = 0,
    finger,
    strings,
    lite = false
  ) {
    const positions = {
      string: [50, 40, 30, 20, 10, 0],
      fret: [-4, 6.5, 18, 30, 42, 54],
      finger: [-3, 8, 19.5, 31.5, 43.5]
    }
    const offset = {
      4: 0,
      6: -1
    }
    const getStringPosition = (string, strings) => positions.string[string + offset[strings]]
    const radius = {
      open: 2,
      fret: 4
    }
    let str
    if (fret === -1) {
      str = `<text
      font-size='0.7rem'
      fill='#444'
      font-family='Verdana'
      text-anchor='middle'
      x='${getStringPosition(string, strings)}'
      y='-2'
      >x</text>`
    } else {
      str = `<g>
      <circle
        stroke-width='0.25'
        stroke='#444'
        fill='${fret === 0 ? 'transparent' : '#444'}'
        cx='${getStringPosition(string, strings)}'
        cy='${positions.fret[fret]}'
        r='${fret === 0 ? radius['open'] : radius['fret']}'
      />
      ${!lite && finger > 0 &&
        `<text
          font-size='3pt'
          font-family='Verdana'
          text-anchor='middle'
          fill='white'
          x='${getStringPosition(string, strings)}'
          y='${positions.finger[fret]}'
        >${finger}</text>`}
    </g>`
    }
    return str
  },

  // tuning: array,
  // frets: array,
  // capo: bool,
  // strings: number(isRequired)
  // baseFret: 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 
  // fretsOnChord: number(isRequired)
  // lite: bool

  //   defaultProps = {
  //   fret: 0,
  //   lite: false
  // }
  neck(
    tuning,
    frets = 0,
    strings,
    fretsOnChord,
    baseFret,
    capo,
    lite = false
  ) {
    const offsets = {
      4: {
        x: 10,
        y: 10,
        length: 40
      },
      6: {
        x: 0,
        y: 0,
        length: 50
      }
    }
    const getNeckHorizonalLine = (pos, strings) => `M ${offsets[strings].x} ${12 * pos} H ${offsets[strings].length}`
    const getNeckVerticalLine = (pos, strings) => `M ${offsets[strings].y + pos * 10} 0 V 48`
    const getNeckPath = (strings, fretsOnChord) => {
      return Array.apply(null, Array(fretsOnChord + 1)).map((_, pos) => getNeckHorizonalLine(pos, strings)).join(' ').concat(Array.apply(null, Array(strings)).map((_, pos) => getNeckVerticalLine(pos, strings)).join(' '))
    }
    const getBarreOffset = (strings, frets, baseFret, capo) => {
      return strings === 6 ?
        frets[0] === 1 || capo ? (baseFret > 9 ? -12 : -11) : (baseFret > 9 ? -10 : -7) :
        frets[0] === 1 || capo ? (baseFret > 9 ? -1 : 0) : (baseFret > 9 ? 3 : 4)
    }

    let str1
    if (baseFret === 1) {
      str1 = `<path
      stroke='#444'
      stroke-width='2'
      stroke-linecap='round'
      stroke-linejoin='round'
      d='${`M ${offsets[strings].x} 0 H ${offsets[strings].length}`}'
    />`
    } else {
      str1 = ` <text
      font-size='0.25rem'
      fill='#444'
      font-family='Verdana'
      x='${getBarreOffset(strings, frets, baseFret, capo)}'
      y='8'
    >${baseFret}fr</text> `
    }
    let str2 = !lite && `<g>
    ${tuning.slice().map((note, index) =>
      `<text
        font-size='0.3rem'
        fill='#444'
        font-family='Verdana'
        text-anchor='middle'
        x='${offsets[strings].x + index * 10}'
        y='53'
      >${note}</text>`
    )}
  </g>`

    return ` <g>
  <path
    stroke='#444'
    stroke-width='0.25'
    stroke-linecap='square'
    stroke-linejoin='square'
    d='${getNeckPath(strings, fretsOnChord)}'/>${str1}${str2}</g>`
  },

  // frets: array,
  // barre: number,
  // capo: bool,
  // lite: bool,
  // finger: 0, 1, 2, 3, 4, 5 
  barre(
    barre,
    frets,
    capo,
    finger,
    lite
  ) {
    const fretXPosition = {
      4: [10, 20, 30, 40, 50],
      6: [0, 10, 20, 30, 40, 50]
    }
    const fretYPosition = [2.35, 13.9, 26, 38]
    const offset = {
      4: 0,
      6: -1
    }
    const positions = {
      string: [50, 40, 30, 20, 10, 0],
      fret: [-4, 6.5, 18, 30, 42, 54],
      finger: [-3, 8, 19.5, 31.5, 43.5]
    }
    const getStringPosition = (string, strings) => positions.string[string + offset[strings]]
    const onlyBarres = (frets, barre) => frets.map((f, index) => ({
      position: index,
      value: f
    })).filter(f => f.value === barre)

    const strings = frets.length
    const barreFrets = onlyBarres(frets, barre)

    const string1 = barreFrets[0].position
    const string2 = barreFrets[barreFrets.length - 1].position
    const width = (string2 - string1) * 10
    const y = fretYPosition[barre - 1]
    let str1 = ''
    if (capo) {
      str1 = `<g>
      <g
        transform='${`translate(${getStringPosition(strings, strings)}, ${positions.fret[barreFrets[0].value]})`}'
        >
        <path d='${`
          M 0, 0
          m -4, 0
          a 4,4 0 1,1 8,0
        `}'
          fill='#555'
          fillOpacity='${0.2}'
          transform='rotate(-90)'
        />
      </g>
      <rect
        fill='#555'
        x='${fretXPosition[strings][0]}'
        y='${fretYPosition[barre - 1]}'
        width='${(strings - 1) * 10}'
        fillOpacity='${0.2}'
        height='${8.25}'
      />
      <g
        transform='${`translate(${getStringPosition(1, strings)}, ${positions.fret[barreFrets[0].value]})`}'
        >
        <path d='${`
          M 0, 0
          m -4, 0
          a 4,4 0 1,1 8,0
        `}'
          fill='#555'
          fillOpacity='${0.2}'
          transform='rotate(90)'
        />
      </g>
    </g>`
    }

    let str2 = barreFrets.map(fret => `<circle
  stroke-width='0.25'
  stroke='#444'
  fill='#444'
  cx='${getStringPosition(strings - fret.position, strings)}'
  cy='${positions.fret[fret.value]}'
  r='${4}'
/>`)
    let str3 = `<rect
    fill='#444'
    x='${fretXPosition[strings][string1]}'
    y='${y}'
    width='${width}'
    height='${8.25}'
  />`
    let str4 = !lite && finger && barreFrets.map(fret => `<text
    font-size='3pt'
    font-family='Verdana'
    text-anchor='middle'
    fill='white'
    x='${getStringPosition(strings - fret.position, strings)}'
    y='${positions.finger[fret.value]}'
  >${finger}</text>`)

    return `<g> ${str1}${str2}${str3}${str4}</g>`
  },

  // chord: PropTypes.any,
  // instrument: instrumentPropTypes,
  // lite: PropTypes.bool

  // export const instrumentPropTypes = PropTypes.shape({
  //   strings: PropTypes.number.isRequired,
  //   fretsOnChord: PropTypes.number.isRequired,
  //   name: PropTypes.string.isRequired,
  //   keys: PropTypes.arrayOf(PropTypes.oneOf([
  //     'A', 'Ab', 'A#', 'B', 'Bb', 'C', 'C#',
  //     'D', 'Db', 'D#', 'E', 'Eb', 'F', 'F#',
  //     'G', 'G#', 'Gb'
  //   ])),
  //   tunings: PropTypes.shape({
  //     standard: PropTypes.arrayOf(PropTypes.string).isRequired
  //   }).isRequired
  // })
  chord(
    chord,
    instrument,
    lite = false
  ) {

    const onlyDots = chord =>
      chord.frets
        .map((f, index) => ({
          position: index,
          value: f
        }))
        .filter(f => !chord.barres || chord.barres.indexOf(f.value) === -1)
    if (chord) {
      let str1 = this.neck(instrument.tunings.standard, chord.frets, instrument.strings, instrument.fretsOnChord, chord.baseFret, chord.capo, lite)
      let str2 = chord.barres && chord.barres.map((barre, index) =>
        this.barre(barre, chord.frets, index === 0 && chord.capo, chord.fingers && chord.fingers[chord.frets.indexOf(barre)], lite))

      let str3 = onlyDots(chord).map(fret => (
        this.dot(instrument.strings - fret.position, fret.value, chord.fingers && chord.fingers[fret.position], instrument.strings, lite)))
      return `<?xml version="1.0" standalone="no"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 
      1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg
      width='100%'
      idth="300" height="220"
      xmlns='http://www.w3.org/2000/svg'
      preserveAspectRatio='xMinYMin meet' 
      viewBox='0 0 80 70'><g
      transform='translate(13, 13)'>${str1}${str2}${str3}</g>
      </svg>`

    } else {
      return null
    }
  },

}



// 例子
// function init() {
//   const chord = {
//     frets: [1, 3, 3, 2, 1, 1],
//     fingers: [1, 3, 4, 2, 1, 1],
//     barres: [1],
//     capo: false,
//     baseFret: 1
//   }
//   const instrument = {
//     strings: 6,
//     fretsOnChord: 4,
//     name: 'Guitar',
//     keys: [],
//     tunings: {
//       standard: ['E', 'A', 'D', 'G', 'B', 'E']
//     }
//   }
//   const lite = false // defaults to false if omitted
//   return react.chord(chord, instrument, lite)

// }


// function writing() {
//   fs.writeFileSync('./public/svg/test.svg', init())
//   let url = `${baseUrl}/svg/test.svg`
//   console.log(url)
// }

// writing()



function analysis(str, keys, suffixes) {
  let key, suffix
  let keyLegal = false
  let suffixLegal = false
  if (str.indexOf('#') === 1 || str.indexOf('b') === 1) {
    key = str.slice(0, 2)
    suffix = str.slice(2)
  } else {
    key = str.slice(0, 1)
    suffix = str.slice(1)
  }
  console.log('key1', key, 'suffix', suffix)
  keys.forEach(item => {
    if (item === key) {
      console.log(item, key)
      keyLegal = true
      return
    }
  })
  if (!keyLegal) {
    return false
    // if (key.includes('#')) {
    //   key.replace('#', 'b')
    // } else if (key.includes('b')) {
    //   key.replace('b', '#')
    // } else {
    //   console.log('key2', key, 'suffix', suffix)
    //   return false
    // }
    // keys.forEach(item => {
    //   if (item === key) {
    //     keyLegal = true
    //     console.log('key3', key, 'suffix', suffix)
    //     return
    //   }
    // })
  } else {
    suffixes.forEach(item => {
      if (item === suffix) {
        suffixLegal = true
        console.log('key4', key, 'suffix', suffix)
        return
      }
    })
    console.log('key5', key, 'suffix', suffix)
    if (keyLegal && suffixLegal) {
      return {
        key,
        suffix
      }
    } else return false
  } 

}


router.get('/getGuitar', (req, res, next) => {
  let { key, suffix } = req.query
  var contents = fs.readFileSync(__dirname + "/../data/guitar.json");
  contents = JSON.parse(contents)
  // let key = "C"
  // let suffix = "/F"
  let positionsIndex = 0
  let standard = ['E', 'A', 'D', 'G', 'B', 'E']

  key = key.replace('#', 'sharp')
  let chords = contents.chords[key]
  let main = contents.main
  let keys = contents.keys
  let chord
  chords.forEach((item, index) => {
    if (item.suffix == suffix) {
      chord = chords[index]
    }
  })

  //     frets: [1, 3, 3, 2, 1, 1],
  //     fingers: [1, 3, 4, 2, 1, 1],
  //     barres: [1],
  //     capo: false,
  //     baseFret: 1
  chord = chord.positions[positionsIndex]


  const instrument = {
    // 线的数量
    strings: main.strings,
    // 和弦品
    fretsOnChord: main.fretsOnChord,
    name: 'Guitar',
    // ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"]
    keys,
    tunings: {
      // 下方的字母
      standard
    }
  }
  // 是否简单
  const lite = false

  console.log('chord', chord)
  console.log('instrument', instrument)
  
  fs.writeFileSync(__dirname + `/../public/svg/test.svg`, react.chord(chord, instrument, lite))
  let url = `${baseUrl}/svg/test.svg`
  contents.url = url
  res.json(util.success(contents))
})


module.exports = router;