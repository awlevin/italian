import { lesson as como } from "./trip-como";
import { lesson as cinqueTerre } from "./trip-cinque-terre";
import { lesson as dolomiti } from "./trip-dolomiti";
import { lesson as firenze } from "./trip-firenze";
import { lesson as milano } from "./trip-milano";
import { lesson as toscana } from "./trip-toscana";
import { lesson as venezia } from "./trip-venezia";
import type { Lesson } from "../types";

/** "Il mio viaggio": the learner's own route, in travel order. */
export const trip: Lesson[] = [milano, como, cinqueTerre, toscana, firenze, dolomiti, venezia];
