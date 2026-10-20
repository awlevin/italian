import type { Table } from "./types";

/**
 * The grammar reference: conjugation and pronoun tables in one place, to look
 * things up after the lessons teach them. Same inline markup as lessons.
 */
export interface GrammarSection {
  /** Stable kebab-case anchor. */
  id: string;
  /** Italian name, shown large. */
  it: string;
  /** English name. */
  title: string;
  /** 1–2 sentences: what it is and when to use it. */
  body: string;
  tables: Table[];
  /** Short rules of thumb under the tables. */
  notes?: string[];
  /** "<lessonId>/<stepId>" of the card that teaches it, for a "Learn it" link. */
  rule?: string;
}

export const grammar: GrammarSection[] = [
  {
    id: "pronomi",
    it: "Pronomi",
    title: "Subject pronouns",
    body: "Usually dropped: the verb ending already says who. «Parlo italiano» is “I speak Italian”.",
    tables: [
      {
        head: ["", "Italian", "English", ""],
        rows: [
          ["1st", "«io»", "I", "lowercase mid-sentence"],
          ["2nd", "«tu»", "you", "friends, family, kids"],
          ["3rd", "«lui» · «lei»", "he · she", ""],
          ["formal", "«Lei»", "you", "takes the lei verb form"],
          ["1st pl.", "«noi»", "we", ""],
          ["2nd pl.", "«voi»", "you all", "also the polite plural"],
          ["3rd pl.", "«loro»", "they", ""],
        ],
      },
    ],
    rule: "verona/teach-lei",
  },
  {
    id: "oggetto",
    it: "Oggetto e riflessivi",
    title: "Object & reflexive pronouns",
    body: "Before a conjugated verb («Lo vedo»), glued to the end of an infinitive or command («Voglio vederlo», «Guardalo!»).",
    tables: [
      {
        head: ["", "Direct", "Indirect", "Reflexive", "After prep."],
        rows: [
          ["io", "«mi»", "«mi»", "«mi»", "«me»"],
          ["tu", "«ti»", "«ti»", "«ti»", "«te»"],
          ["lui", "«lo»", "«gli»", "«si»", "«lui»"],
          ["lei / Lei", "«la»", "«le»", "«si»", "«lei»"],
          ["noi", "«ci»", "«ci»", "«ci»", "«noi»"],
          ["voi", "«vi»", "«vi»", "«vi»", "«voi»"],
          ["loro", "«li» · «le»", "«gli»", "«si»", "«loro»"],
        ],
      },
    ],
    notes: ["**Indirect** answers “to whom?”: «Gli scrivo» is “I write to him”, ‹le escribo›."],
    rule: "amalfi/direct",
  },
  {
    id: "presente",
    it: "Presente",
    title: "Present tense",
    body: "Drop «-are», «-ere» or «-ire» and add the endings. Also used for the near future: «Domani parto».",
    tables: [
      {
        caption: "Regular verbs",
        head: ["", "parlare", "credere", "dormire", "finire"],
        rows: [
          ["io", "«parlo»", "«credo»", "«dormo»", "«finisco»"],
          ["tu", "«parli»", "«credi»", "«dormi»", "«finisci»"],
          ["lui/lei", "«parla»", "«crede»", "«dorme»", "«finisce»"],
          ["noi", "«parliamo»", "«crediamo»", "«dormiamo»", "«finiamo»"],
          ["voi", "«parlate»", "«credete»", "«dormite»", "«finite»"],
          ["loro", "«parlano»", "«credono»", "«dormono»", "«finiscono»"],
        ],
      },
      {
        caption: "The irregulars you need every day",
        head: ["", "essere", "avere", "andare", "fare", "volere", "potere"],
        rows: [
          ["io", "«sono»", "«ho»", "«vado»", "«faccio»", "«voglio»", "«posso»"],
          ["tu", "«sei»", "«hai»", "«vai»", "«fai»", "«vuoi»", "«puoi»"],
          ["lui/lei", "«è»", "«ha»", "«va»", "«fa»", "«vuole»", "«può»"],
          ["noi", "«siamo»", "«abbiamo»", "«andiamo»", "«facciamo»", "«vogliamo»", "«possiamo»"],
          ["voi", "«siete»", "«avete»", "«andate»", "«fate»", "«volete»", "«potete»"],
          ["loro", "«sono»", "«hanno»", "«vanno»", "«fanno»", "«vogliono»", "«possono»"],
        ],
      },
    ],
    notes: [
      "**Loro** forms stress the first syllable: PAR-la-no, not par-LA-no.",
      "Some «-ire» verbs add «-isc-» except for noi and voi: «capire», «preferire», «finire».",
    ],
    rule: "firenze/present-regular",
  },
  {
    id: "passato-prossimo",
    it: "Passato prossimo",
    title: "Past: what happened",
    body: "Present of «avere» or «essere» plus a past participle. The everyday past for finished events: «Ho mangiato», «Sono andata».",
    tables: [
      {
        head: ["", "with avere", "with essere"],
        rows: [
          ["io", "«ho parlato»", "«sono andato/a»"],
          ["tu", "«hai parlato»", "«sei andato/a»"],
          ["lui/lei", "«ha parlato»", "«è andato/a»"],
          ["noi", "«abbiamo parlato»", "«siamo andati/e»"],
          ["voi", "«avete parlato»", "«siete andati/e»"],
          ["loro", "«hanno parlato»", "«sono andati/e»"],
        ],
      },
      {
        caption: "Past participles",
        head: ["Verb", "Participle", ""],
        rows: [
          ["-are", "«-ato»", "«parlare» → «parlato»"],
          ["-ere", "«-uto»", "«credere» → «creduto»"],
          ["-ire", "«-ito»", "«dormire» → «dormito»"],
          ["irregular", "", "«fatto», «detto», «visto», «preso», «stato», «venuto», «messo», «scritto»"],
        ],
      },
    ],
    notes: [
      "**Essere** for movement and change («andare», «venire», «partire», «arrivare», «nascere», «diventare»), reflexives and «piacere». **Avere** for nearly everything else.",
      "With essere the participle agrees like an adjective: «Maria è arrivata».",
    ],
    rule: "napoli/pp-basics",
  },
  {
    id: "imperfetto",
    it: "Imperfetto",
    title: "Past: how it was",
    body: "For background, description and habits: «Faceva freddo», «Da bambino giocavo a calcio». Built like ‹hablaba›.",
    tables: [
      {
        head: ["", "parlare", "credere", "dormire", "essere"],
        rows: [
          ["io", "«parlavo»", "«credevo»", "«dormivo»", "«ero»"],
          ["tu", "«parlavi»", "«credevi»", "«dormivi»", "«eri»"],
          ["lui/lei", "«parlava»", "«credeva»", "«dormiva»", "«era»"],
          ["noi", "«parlavamo»", "«credevamo»", "«dormivamo»", "«eravamo»"],
          ["voi", "«parlavate»", "«credevate»", "«dormivate»", "«eravate»"],
          ["loro", "«parlavano»", "«credevano»", "«dormivano»", "«erano»"],
        ],
      },
      {
        caption: "Which past?",
        head: ["Passato prossimo", "Imperfetto"],
        rows: [
          ["One finished event: «Ho mangiato una pizza»", "Scene and description: «C'era il sole»"],
          ["The interruption: «è arrivato Marco»", "What was going on: «Leggevo…»"],
        ],
      },
    ],
    rule: "napoli/imperfetto",
  },
  {
    id: "futuro",
    it: "Futuro",
    title: "Future: “will”",
    body: "Drop the final «-e» of the infinitive and add the endings; «-are» verbs also turn the **a** into **e**. Just like ‹hablaré›.",
    tables: [
      {
        head: ["", "Ending", "parlare", "credere", "dormire"],
        rows: [
          ["io", "-ò", "«parlerò»", "«crederò»", "«dormirò»"],
          ["tu", "-ai", "«parlerai»", "«crederai»", "«dormirai»"],
          ["lui/lei", "-à", "«parlerà»", "«crederà»", "«dormirà»"],
          ["noi", "-emo", "«parleremo»", "«crederemo»", "«dormiremo»"],
          ["voi", "-ete", "«parlerete»", "«crederete»", "«dormirete»"],
          ["loro", "-anno", "«parleranno»", "«crederanno»", "«dormiranno»"],
        ],
      },
      {
        caption: "Irregular stems (same endings)",
        head: ["Verb", "Stem", "io"],
        rows: [
          ["essere", "sar-", "«sarò»"],
          ["avere", "avr-", "«avrò»"],
          ["andare", "andr-", "«andrò»"],
          ["fare", "far-", "«farò»"],
          ["potere", "potr-", "«potrò»"],
          ["volere", "vorr-", "«vorrò»"],
          ["venire", "verr-", "«verrò»"],
          ["dovere", "dovr-", "«dovrò»"],
          ["vedere", "vedr-", "«vedrò»"],
        ],
      },
    ],
    notes: [
      "Spelling keeps the sound: «pagare» → «pagherò», «cercare» → «cercherò», «mangiare» → «mangerò».",
      "It also guesses: «Sarà a casa» is “he's probably home”.",
    ],
    rule: "lecce/futuro-endings",
  },
  {
    id: "condizionale",
    it: "Condizionale",
    title: "Conditional: “would”",
    body: "Same stem as the future, new endings. It makes requests polite: you already know «vorrei».",
    tables: [
      {
        head: ["", "Ending", "parlare", "essere", "avere"],
        rows: [
          ["io", "-ei", "«parlerei»", "«sarei»", "«avrei»"],
          ["tu", "-esti", "«parleresti»", "«saresti»", "«avresti»"],
          ["lui/lei", "-ebbe", "«parlerebbe»", "«sarebbe»", "«avrebbe»"],
          ["noi", "-emmo", "«parleremmo»", "«saremmo»", "«avremmo»"],
          ["voi", "-este", "«parlereste»", "«sareste»", "«avreste»"],
          ["loro", "-ebbero", "«parlerebbero»", "«sarebbero»", "«avrebbero»"],
        ],
      },
    ],
    notes: ["Polite asks: «Vorrei un caffè», «Potrebbe aiutarmi?», «Mi piacerebbe», «Dovresti provarlo»."],
    rule: "lecce/condizionale",
  },
  {
    id: "riassunto",
    it: "Riassunto",
    title: "All the tenses at a glance",
    body: "One verb, «parlare», through every tense on this page.",
    tables: [
      {
        head: ["Tense", "Use", "io"],
        rows: [
          ["Presente", "now, habits, soon", "«parlo»"],
          ["Passato prossimo", "what happened", "«ho parlato»"],
          ["Imperfetto", "how it was, used to", "«parlavo»"],
          ["Futuro", "will", "«parlerò»"],
          ["Condizionale", "would", "«parlerei»"],
        ],
      },
    ],
  },
];
