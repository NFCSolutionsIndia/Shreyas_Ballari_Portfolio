/**
 * Illustrative photos for the Studio's place pages, standing in until the family supplies real
 * ones. None show Shreyas. All are public domain (CC0 or "no known copyright"), found through
 * Openverse and served from Flickr; each entry notes its Flickr page.
 */
export interface Photo {
  src: string;
  alt: string;
}

const flickr = (path: string, alt: string): Photo => ({ src: `https://live.staticflickr.com/${path}_c.jpg`, alt });

export const PHOTOS = {
  // flickr.com/photos/132318516@N08/20683459225
  cancerCell: flickr('746/20683459225_a7bcabab3a', 'A cancer cell under a fluorescence microscope'),
  // flickr.com/photos/132318516@N08/40379829875
  cellsIllustration: flickr('807/40379829875_8a7cc48b0f', 'Illustration of cancer cells among healthy tissue'),
  // flickr.com/photos/21051491@N02/11586303026
  beaker: flickr('5488/11586303026_7a9affabc7', 'Blue crystals in a glass beaker'),
  // flickr.com/photos/21051491@N02/11586304016
  testTube: flickr('7370/11586304016_90f3ded54b', 'Blue crystals in a test tube'),
  // flickr.com/photos/39735679@N00/2883393965
  stockExchange: flickr('3260/2883393965_c9f3588c4e', 'The New York Stock Exchange building'),
  // flickr.com/photos/153311384@N03/40245495764
  code: flickr('4781/40245495764_c4e29123e7', 'Code open in a text editor'),
  // flickr.com/photos/34409164@N06/8076464389
  telescope: flickr('8336/8076464389_d97895b23a', 'A brass telescope pointed at the sky'),
  // flickr.com/photos/132795455@N08/22555208593
  openBook: flickr('683/22555208593_9d37a9abea', 'An open book with fanned pages'),
  // flickr.com/photos/49208525@N08/6343722631
  notes: flickr('6218/6343722631_84be289da6', 'Handwritten notes on a clipboard'),
  // flickr.com/photos/132795455@N08/26421751605
  reading: flickr('1711/26421751605_5905f54891', 'An open book on a white table'),
  // flickr.com/photos/132795455@N08/17970790025
  handsBook: flickr('8819/17970790025_6fd6ee3455', 'Hands holding an open book'),
  // flickr.com/photos/37996646802@N01/265279980
  desk: flickr('85/265279980_c2fb866a56', 'A desk with notebooks, a map and a pen'),
  // flickr.com/photos/37996646802@N01/6289008
  mathBoard: flickr('3/6289008_1bd0475ed5', 'Maths written on a chalkboard'),
  // flickr.com/photos/8572247@N03/11864347194
  galaxy: flickr('5492/11864347194_f00de6f51e', 'Spiral galaxy M83, photographed by the Hubble Space Telescope'),
  // flickr.com/photos/8212496@N06/7782753778
  papers: flickr('8308/7782753778_d7976dd15a', 'Stacks of papers on a desk'),
  // flickr.com/photos/37996646802@N01/46702870
  classroom: flickr('32/46702870_bc141969f1', 'An empty classroom with desks'),
  // flickr.com/photos/37996646802@N01/2905046218
  classroomRows: flickr('3159/2905046218_c082110783', 'Rows of desks in an empty classroom'),
  // flickr.com/photos/99865395@N05/9493920086
  computerRoom: flickr('5340/9493920086_dbf96d2ff2', 'A school computer room'),
  // flickr.com/photos/55958070@N08/5362387448
  chalkboardRoom: flickr('5168/5362387448_651374daac', 'A classroom with a chalkboard'),
  // flickr.com/photos/58558794@N07/5818462618
  letter: flickr('2619/5818462618_a83d3067d1', 'An old handwritten envelope'),
} satisfies Record<string, Photo>;
