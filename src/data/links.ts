// Link puzzles: four groups of four, easiest first (yellow, green, blue, purple).
// Some puzzles plant a red herring: a word that seems to fit two groups but only one grouping uses every word.
type Raw = [name: string, words: string][]

const RAW: Raw[] = [
  [['Shades of blue', 'NAVY TEAL COBALT AZURE'], ['Dog breeds', 'BOXER POODLE BEAGLE PUG'], ['___cake', 'CUP PAN CHEESE SPONGE'], ['Hidden numbers', 'OFTEN WEIGHT CANINE PHONE']],
  [['Planets', 'MARS VENUS SATURN MERCURY'], ['Car parts', 'CLUTCH BUMPER HOOD AXLE'], ['Greek letters', 'ALPHA DELTA SIGMA OMEGA'], ['Things with keys', 'PIANO MAP FLORIDA TYPEWRITER']],
  [['Breakfast foods', 'BAGEL WAFFLE OMELET CEREAL'], ['Card games', 'POKER SNAP RUMMY SOLITAIRE'], ['___fly', 'BUTTER DRAGON FIRE HOUSE'], ['Sound like letters', 'SEA TEA EYE WHY']],
  [['Instruments', 'VIOLIN TUBA FLUTE CELLO'], ['Kitchen tools', 'WHISK LADLE SPATULA GRATER'], ['Things you can break', 'RECORD HEART PROMISE ICE'], ['Hidden animals', 'SCATTER CRATE BEARD TOWEL']],
  [['Weather', 'HAIL SLEET FOG DRIZZLE'], ['Chess pieces', 'KING QUEEN BISHOP KNIGHT'], ['Things with shells', 'TURTLE EGG TACO SNAIL'], ['___ball', 'SNOW BASKET FOOT EYE']],
  [['Currencies', 'EURO YEN PESO RUPEE'], ['Fabrics', 'DENIM SILK LINEN VELVET'], ['Things you draw', 'BATH CURTAIN SWORD BREATH'], ['Palindromes', 'LEVEL RADAR KAYAK CIVIC']],
  [['Trees', 'OAK MAPLE BIRCH CEDAR'], ['Board games', 'CLUE RISK SORRY CHECKERS'], ['Units of time', 'SECOND MINUTE DECADE ERA'], ['___board', 'KEY SKATE CARD SURF']],
  [['Birds', 'ROBIN EAGLE PARROT HERON'], ['Pasta', 'PENNE FUSILLI RAVIOLI LASAGNA'], ['In a wallet', 'CASH RECEIPT LICENSE CARD'], ['Sun___', 'FLOWER GLASSES BURN DIAL']],
  [['Vegetables', 'CARROT LEEK RADISH CELERY'], ['Dances', 'SALSA WALTZ POLKA SAMBA'], ['Computer parts', 'MOUSE MONITOR CHIP KEYBOARD'], ['NATO alphabet', 'TANGO HOTEL VICTOR OSCAR']],
  [['Sports', 'TENNIS HOCKEY RUGBY ROWING'], ['Fish', 'TROUT COD TUNA HADDOCK'], ['Pinkish-orange colors', 'CORAL PEACH SALMON APRICOT'], ['___ club', 'GOLF BOOK FAN NIGHT']],
  [['Body parts', 'ELBOW ANKLE WRIST SHIN'], ['Footwear', 'BOOT SANDAL LOAFER SNEAKER'], ['Things you pitch', 'TENT IDEA BASEBALL PRODUCT'], ['Silent K', 'KNIFE KNOT KNOCK KNEE']],
  [['Gems', 'RUBY EMERALD SAPPHIRE OPAL'], ['Programming languages', 'PYTHON RUST JAVA SWIFT'], ['Snakes', 'COBRA VIPER MAMBA ADDER'], ['___stone', 'KIDNEY MILE BIRTH CORNER']],
  [['Coffee drinks', 'LATTE MOCHA ESPRESSO CORTADO'], ['Shapes', 'OVAL PRISM CUBE CONE'], ['Things that get frozen', 'PEAS YOGURT ASSETS TUNDRA'], ['Hidden trees', 'SPINE FIRST HELMET SOAK']],
  [['Toys', 'KITE YOYO PUZZLE DOLL'], ['Insects', 'BEETLE CRICKET MOTH WASP'], ['Things with wings', 'AIRPLANE ANGEL STAGE HOSPITAL'], ['Things with teeth', 'COMB ZIPPER SAW GEAR']],
  [['Capital cities', 'PARIS ROME CAIRO LIMA'], ['Herbs', 'BASIL SAGE DILL MINT'], ['Units of measure', 'METER LITER GRAM OUNCE'], ['Sound like time words', 'THYME WEAK OUR DAZE']],
  [['Clothing', 'SCARF JACKET BLOUSE VEST'], ['Tropical fruit', 'MANGO PAPAYA GUAVA LYCHEE'], ['Things you toss', 'SALAD COIN PANCAKE CABER'], ['Hidden fruit', 'PLUMBER DATELINE PEARL FIGURE']],
  [['Continents', 'ASIA AFRICA EUROPE ANTARCTICA'], ['Cheeses', 'BRIE CHEDDAR FETA GOUDA'], ['Poker moves', 'BLUFF FOLD RAISE CALL'], ['___line', 'DEAD PUNCH SKY HEAD']],
  [['Camping gear', 'TENT LANTERN COMPASS CANTEEN'], ['Math words', 'SUM ANGLE RATIO FRACTION'], ['Photo___', 'BOMB GRAPH COPY SYNTHESIS'], ['Things that rise', 'SUN BREAD TIDE PRICES']],
  [['Farm animals', 'GOAT HORSE SHEEP PIG'], ['Typefaces', 'ARIAL HELVETICA GARAMOND FUTURA'], ['Things with horns', 'RHINO CAR UNICORN VIKING'], ['___fish', 'GOLD CAT SWORD STAR']],
  [['In the sky', 'CLOUD MOON COMET RAINBOW'], ['Baking staples', 'FLOUR YEAST SUGAR BUTTER'], ['Nuts', 'ALMOND CASHEW PECAN WALNUT'], ['___light', 'FLASH SPOT DAY HEAD']],
  [['Jobs', 'PILOT NURSE CHEF PLUMBER'], ['Rivers', 'NILE AMAZON DANUBE THAMES'], ['Mythical creatures', 'GRIFFIN PHOENIX HYDRA KRAKEN'], ['___house', 'GREEN LIGHT WARE CLUB']],
  [['Months', 'JANUARY OCTOBER AUGUST JUNE'], ['May, might and friends', 'MAY MIGHT MUST SHALL'], ['___post', 'GOAL LAMP SIGN OUT'], ['Things with rings', 'SATURN TREE CIRCUS OLYMPICS']],
  [['Desserts', 'BROWNIE TART PUDDING SORBET'], ['Dog commands', 'SIT STAY HEEL FETCH'], ['Parts of a shoe', 'SOLE LACE TONGUE EYELET'], ['Things you can skip', 'STONE ROPE BREAKFAST CLASS']],
  [['Kitchen appliances', 'OVEN TOASTER BLENDER KETTLE'], ['Elements', 'GOLD IRON NEON CARBON'], ['Golf words', 'PUTT BIRDIE EAGLE TEE'], ['Hidden tea', 'STEAK INSTEAD TEAM STEADY']],
  [['Stationery', 'STAPLER ERASER RULER MARKER'], ['Nobility', 'DUKE BARON EARL PRINCE'], ['In a beehive', 'QUEEN DRONE HIVE NECTAR'], ['___down', 'COUNT MELT SHUT SLOW']],
  [['Breads', 'RYE BRIOCHE SOURDOUGH BAGUETTE'], ['Sea creatures', 'OCTOPUS SQUID DOLPHIN SEAL'], ['Things you seal', 'ENVELOPE DEAL JAR FATE'], ['___ship', 'FRIEND CHAMPION LEADER WAR']],
  [['Flowers', 'TULIP DAISY ORCHID ROSE'], ['Board game bits', 'DICE TOKEN CARD TIMER'], ['Things that spin', 'TOP WHEEL GLOBE YARN'], ['___pad', 'LILY LAUNCH NOTE KEY']],
  [['Countries', 'PERU CHILE CUBA NEPAL'], ['Spicy peppers', 'JALAPENO HABANERO CAYENNE PAPRIKA'], ['___bean', 'JELLY KIDNEY COFFEE STRING'], ['Rhymes with oil', 'TOIL SPOIL FOIL BOIL']],
  [['Hats', 'BERET FEDORA BEANIE STETSON'], ['Ways to cook', 'BAKE FRY STEAM GRILL'], ['Clouds', 'CIRRUS CUMULUS STRATUS NIMBUS'], ['___work', 'HOME TEAM FIRE CLOCK']],
  [['Furniture', 'SOFA DESK DRESSER STOOL'], ['US coins', 'PENNY NICKEL DIME QUARTER'], ['Metals', 'COPPER TIN ZINC LEAD'], ['___paper', 'SAND WALL NEWS TOILET']],
  [['Emotions', 'JOY ANGER FEAR ENVY'], ['Animal groups', 'PRIDE MURDER SCHOOL PACK'], ['Things that blow', 'WIND WHISTLE BUBBLE FUSE'], ['___print', 'FOOT FINGER BLUE FINE']],
  [['Vehicles', 'TRUCK VAN SCOOTER TRAM'], ['Space', 'ORBIT ASTEROID GALAXY NEBULA'], ['Salad greens', 'KALE ARUGULA SPINACH ROCKET'], ['___port', 'PASS AIR SEA TRANS']],
  [['Rooms', 'KITCHEN ATTIC CELLAR LOUNGE'], ['Deserts', 'SAHARA GOBI MOJAVE KALAHARI'], ['___room', 'MUSH BALL CLASS STORE'], ['Add an S in front', 'TRAIN MILE NOW PRAY']],
  [['Sweets', 'FUDGE TOFFEE NOUGAT CARAMEL'], ['Knots', 'REEF BOWLINE HITCH GRANNY'], ['On a ship', 'MAST ANCHOR HULL DECK'], ['___wood', 'HOLLY DRIFT FIRE SANDAL']],
  [['Music genres', 'JAZZ BLUES REGGAE FUNK'], ['Cat breeds', 'SIAMESE PERSIAN SPHYNX BENGAL'], ['Striped things', 'ZEBRA BARCODE TIGER FLAG'], ['Soap___', 'OPERA BOX STONE DISH']],
  [['Sports gear', 'HELMET PADDLE NET GLOVE'], ['Loud noise', 'DIN RACKET CLAMOR UPROAR'], ['___worm', 'BOOK EARTH SILK GLOW'], ['Hidden hat', 'CHAT WHAT THAT SHATTER']],
  [['Snacks', 'PRETZEL POPCORN NACHOS CHIPS'], ['Christmas', 'TINSEL WREATH CAROL STOCKING'], ['___jack', 'LUMBER BLACK APPLE CRACKER'], ['Things with trunks', 'ELEPHANT TREE CAR SWIMMER']],
  [['Languages', 'SPANISH GERMAN TAGALOG ITALIAN'], ['Filipino dishes', 'ADOBO SINIGANG LECHON PANCIT'], ['___ fries', 'FRENCH CURLY HOME CHEESE'], ['Things that bark', 'DOG TREE SEAL FOX']],
  [['Keyboard keys', 'SHIFT ENTER ESCAPE DELETE'], ['To change', 'ALTER MODIFY ADJUST VARY'], ['Ballet moves', 'PLIE PIROUETTE ARABESQUE JETE'], ['___ code', 'ZIP DRESS MORSE AREA']],
  [['Pets', 'HAMSTER RABBIT PARROT GOLDFISH'], ['Shades of green', 'LIME MINT JADE SAGE'], ['Pizza toppings', 'OLIVE PEPPERONI MUSHROOM ONION'], ['Things with scales', 'FISH PIANO MAP DRAGON']],
]

export type Group = { name: string; words: string[]; level: number }
export type LinkPuzzle = Group[]

export const LINKS: LinkPuzzle[] = RAW.map((p) => p.map(([name, words], level) => ({ name, words: words.split(' '), level })))
