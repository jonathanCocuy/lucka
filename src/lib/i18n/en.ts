import type { WidgetId, WidgetSize } from '@/lib/dashboard/layout'

// Every text the app shows. es.ts has the same shape: TypeScript flags a missing key.
// Texts with values are functions. Errors are templates: their values come from data or Rust.
export const en = {
  meta: {
    description: 'Your money, in order and for your eyes only.',
    settingsTitle: 'Settings · Lucka',
  },

  common: {
    save: 'Save',
    saving: 'Saving…',
    remove: 'Remove',
    removeItem: (name: string) => `Remove ${name}`,
    notNow: 'Not now',
    close: 'Close',
    of: 'of',
    day: (day: number) => `Day ${day}`,
    recommended: 'Recommended',
    noDescription: 'No description',
    investment: 'Investment',
    quote: (text: string) => `“${text}”`,
  },

  nav: {
    dashboard: 'Dashboard',
    settings: 'Settings',
  },

  preferences: {
    language: 'Language',
    currency: 'Currency',
    // Each language in its own words, so anyone can find theirs.
    languages: { en: 'English', es: 'Español' },
    currencies: { USD: 'US dollar', COP: 'Colombian peso' },
    sample: (amount: string) => `Amounts look like ${amount}`,
  },

  onboarding: {
    hello: (name: string) => (name ? `Hi, ${name}` : 'Hi'),
    stepOf: (step: number, total: number) => `Step ${step} of ${total}`,
    steps: {
      preferences: {
        label: 'Language',
        title: 'Language and currency',
        hint: 'Change the language anytime. The currency stays fixed once you record something.',
      },
      income: {
        label: 'Income',
        title: 'How much comes in each month?',
        hint: 'What lands in your account, after deductions.',
      },
      fixed: {
        label: 'Fixed',
        title: 'Your fixed expenses',
        hint: 'What you pay every month no matter what: rent, utilities, plans.',
      },
      categories: {
        label: 'Categories',
        title: 'Budget by category',
        hint: "The variable stuff. We'll let you know when you go over.",
      },
      investments: {
        label: 'Investments',
        title: 'Do you invest?',
        hint: 'No goals for now. Just to keep them in mind.',
      },
      recap: {
        label: 'Summary',
        title: 'Your month at a glance',
        hint: 'You can change all of it later from the dashboard.',
      },
    },
    back: 'Back',
    next: 'Next',
    start: 'Start',
    recap: {
      income: 'Income',
      payday: (day: number) => `Paid on day ${day}`,
      fixed: 'Fixed expenses',
      fixedCount: (n: number) =>
        n === 1 ? '1 fixed expense' : `${n} fixed expenses`,
      budgets: 'Budgets',
      categoryCount: (n: number) =>
        n === 1 ? '1 category' : `${n} categories`,
      unassigned: 'Unassigned',
      overIncome: 'Your plans go over your income',
      margin: 'Free margin each month',
      investments: (amount: string) => `Investments: ${amount} saved.`,
    },
  },

  profile: {
    name: "What's your name?",
    income: 'Monthly take-home pay',
    payday: 'Payday',
    paydayHint:
      "Your month runs from payday to payday. If a month doesn't have that day, its last day counts.",
  },

  fixedEditor: {
    name: 'Name',
    amount: 'Amount',
    dueDay: 'Due day',
    fromInvestments: 'from investments',
    placeholder: 'e.g. Rent',
    dueDayOf: (day: number) => `Due day: ${day}`,
    pickDay: (name: string) => `Due day for ${name || 'this expense'}`,
    add: 'Add fixed expense',
  },

  categoryEditor: {
    suggestions: [
      'Groceries',
      'Partner',
      'Going out',
      'Transport',
      'Clothes',
      'Treats',
      'Health',
      'Gifts',
      'Subscriptions',
      'Pets',
    ],
    category: 'Category',
    budget: 'Monthly budget',
    placeholder: 'e.g. Partner',
    add: 'Another category',
  },

  investmentEditor: {
    label: 'Investments',
    yes: 'Yes, I invest',
    no: 'Not yet',
    contribution: 'Monthly contribution',
    balance: 'Total invested',
    hint: 'The monthly contribution becomes a fixed expense. The balance is just for reference.',
  },

  dashboard: {
    hello: (name: string) => `Hi, ${name}`,
    paydayTomorrow: 'payday is tomorrow',
    daysToPayday: (n: number) => `${n} days to payday`,
    done: 'Done',
    customize: 'Customize',
    add: 'Add',
    empty: 'Your dashboard is empty.',
    hidden: 'Hidden widgets',
    tapToAdd: 'Tap one to add it back',
    dragHint: 'Drag the cards to reorder them. Hide them with −.',
    widgets: {
      available: 'Available',
      budgets: 'Budgets',
      fixed: 'Fixed expenses',
      recent: 'Recent activity',
    } satisfies Record<WidgetId, string>,
    editIncome: 'Edit income',
    editBudgets: 'Edit budgets',
    editFixed: 'Edit fixed expenses',
  },

  widget: {
    sizes: {
      third: '1/3',
      half: '1/2',
      'two-thirds': '2/3',
      full: 'full',
    } satisfies Record<WidgetSize, string>,
    moveBack: (title: string) => `Move ${title} earlier`,
    moveForward: (title: string) => `Move ${title} later`,
    size: (title: string, size: string) => `${title} size: ${size}. Change`,
    hide: (title: string) => `Hide ${title}`,
  },

  available: {
    spent: 'Spent',
    committed: 'Committed',
    free: 'Free',
    label: 'Available',
    over: 'Overspent',
    ofIncome: (income: string) => `of ${income}`,
  },

  budgets: {
    used: 'used',
    overCount: (n: number) => `${n} over budget`,
    overPlan: (amount: string) => `+${amount} over plan`,
    addTo: (name: string) => `Add an expense to ${name}`,
    noBudget: 'No budget',
    left: (amount: string) => `${amount} left`,
    empty: 'No categories yet. Add them with ✎.',
  },

  fixedPanel: {
    paid: 'paid',
    pending: 'Pending',
    paidOne: 'Paid',
    partly: (amount: string) => `${amount} paid`,
    empty: 'No fixed expenses yet. Add them with ✎.',
  },

  recent: {
    fixed: 'Fixed',
    noCategory: 'No category',
    extraIncome: 'Extra income',
    empty: 'Nothing recorded this cycle yet.',
    seeAll: 'See all',
  },

  movements: {
    eyebrow: 'This cycle',
    title: 'Activity',
    fixed: (name: string) => `Fixed · ${name}`,
    deleteExpense: 'Delete expense',
    deleteIncome: 'Delete income',
    empty: 'Nothing recorded yet.',
    totalSpent: 'Total spent',
    extraIncome: 'Extra income',
    totalExtra: 'Total extra',
  },

  overBudget: {
    eyebrow: 'Heads up',
    title: 'Over budget',
    meta: (spent: string, budget: string) =>
      `Spent ${spent} · budget ${budget}`,
    empty: 'Nothing over budget. Nice.',
  },

  editModal: {
    fixed: 'Fixed expenses',
    categories: 'Categories and budgets',
    profile: 'Income and investments',
  },

  register: {
    title: 'New entry',
    type: 'Type',
    expense: 'Expense',
    income: 'Income',
    howMuch: 'How much?',
    onWhat: 'On what?',
    newCategory: '+ New',
    name: 'Name',
    namePlaceholder: 'e.g. Gifts',
    budget: 'Budget (optional)',
    isFixed: 'Is it a fixed expense?',
    whichFixed: 'Which fixed expense are you paying?',
    allPaid: 'All fixed expenses are paid.',
    backToCategories: 'Back to categories',
    moreDetails: 'More details',
    description: 'Description',
    expensePlaceholder: 'e.g. Dinner with friends',
    incomePlaceholder: 'e.g. Bonus',
    date: 'Date',
    incomeHint:
      'It only adds to the available amount of the cycle its date falls in.',
    saveExpense: 'Save expense',
    saveIncome: 'Save income',
  },

  settings: {
    title: 'Settings',
    subtitle: 'Your data lives only on this computer.',
    preferences: 'Language and currency',
    currencyLocked: (currency: string) =>
      `You already have records in ${currency}, so the currency is fixed. To use another one, delete all your data and start over.`,
    ai: 'AI and voice',
    backup: 'Backup',
    backupHint:
      'One JSON file with everything. Use it to move to another computer or to keep a copy.',
    exported: 'Data exported.',
    export: 'Export data',
    imported: 'Data imported.',
    import: 'Import data',
    wipe: 'Delete everything',
    wipeHint: 'Leaves Lucka like new and takes you back to the start.',
    wipeButton: 'Delete all my data',
    about: 'About Lucka',
    version: 'Version',
    dataFile: 'Data file',
    privacy: 'Privacy and permissions',
    privacyHint: 'Lucka needs microphone access for voice entry.',
    openMicSettings: 'Open Microphone Settings',
    checkMic: 'Check microphone access',
    micGranted: 'Microphone access granted.',
  },

  backup: {
    fileType: 'Lucka backup',
    importTitle: 'Import data',
    importMessage:
      "All your data gets replaced by the file's. This can't be undone.",
    importOk: 'Import',
    wipeTitle: 'Delete all my data',
    wipeMessage: 'All your data on this computer gets deleted.',
    wipeOk: 'Continue',
    lastTitle: 'Last warning',
    lastMessage:
      "Sure? This can't be undone. Export first if you want to keep it.",
    lastOk: 'Delete everything',
    cancel: 'Cancel',
  },

  ai: {
    localModel: 'Local model',
    hint: 'Record expenses by talking. Your voice is processed on this computer. With a key, only the text goes to the provider you pick.',
    usedWhenTalking: 'Used when you talk',
    useWhenTalking: 'Use when talking',
    voiceModel: (name: string | null) =>
      `Voice model: ${name ?? 'not downloaded'}`,
    addAnother: 'Add another AI',
    setUp: 'Set up AI',
    changeVoice: 'Change voice model',
    downloadVoice: 'Download voice model',
  },

  aiSetup: {
    eyebrow: 'AI',
    titles: {
      intro: 'Record by talking',
      provider: 'Pick your AI',
      whisper: 'Voice model',
      mic: 'Microphone',
      done: 'All set!',
    },
    introLead:
      'Tell Lucka what you spent, for example: “12 dollars on lunch and I paid the rent”. The AI understands it and you just confirm.',
    introHint:
      'You need a voice model (downloaded once) and an AI: a model on your computer or your own OpenAI, Claude or Gemini key.',
    yes: 'Yes, set it up',
    later: 'You can turn it on later in Settings.',
    whisperLead:
      'Turns your voice into text. It runs on your computer: the audio never leaves it.',
    download: 'Download',
    doneLead:
      "Tap the microphone at the bottom right, say what you spent and tap it again. You'll see a summary before anything is saved.",
    gotIt: 'Got it',
    aiType: 'AI type',
    local: 'On my computer',
    online: 'With my key',
    privateTitle: '100% private.',
    privateText:
      'Everything runs on this computer, offline. It takes disk space and a few seconds per sentence.',
    downloadAndUse: 'Download and use',
    provider: 'Provider',
    model: 'Model',
    keyLabel: 'API key',
    keyPlaceholder: 'Paste your key here',
    keyWhere: (url: string) => `Get it at ${url}`,
    keySafe: 'Your key is safe.',
    keychain: "It's stored in your system's keychain, not in Lucka.",
    notInBackups: "It isn't in the data file or in backups.",
    onlyFor: (name: string) =>
      `It's only used to talk to ${name}. Nobody else sees it.`,
    sentTo: (name: string) =>
      `Heads up: the text of what you say and your category names go to ${name} so it can understand them. The audio never leaves your computer.`,
    testing: 'Testing the key…',
    testAndSave: 'Test and save',
    downloaded: 'Downloaded',
    downloading: 'Downloading…',
    useThis: 'Use this one',
    replaces: (name: string) => `Replaces ${name}.`,
    micLead:
      'Lucka needs permission to use the microphone. Your system will ask you now.',
    listening: 'Listening…',
    allow: 'Allow and test',
  },

  voice: {
    states: {
      idle: 'Record by talking',
      recording: 'Stop and process',
      transcribing: 'Listening to what you said…',
      thinking: 'Understanding…',
    },
    checkSettings: 'Check Settings',
    openMicSettings: 'Open Microphone Settings',
    silenceHint: 'Not hearing anything. Try speaking louder.',
  },

  summary: {
    eyebrow: 'By voice',
    title: 'Save this?',
    kinds: { expense: 'Expense', fixed: 'Fixed expense', income: 'Income' },
    nothingLeft: 'Nothing left to save.',
    category: 'Category',
    newCategory: (name: string) => `${name} (new)`,
    newCategories: 'New categories',
    budget: 'Budget (optional)',
    save: (n: number) => (n === 1 ? 'Save 1 record' : `Save ${n} records`),
    discard: 'Discard',
    anItem: 'an item',
    warnings: {
      notUnderstood: "I didn't understand what you said. Try again.",
      notAFixed: (label: string) =>
        `“${label}” isn't one of your fixed expenses.`,
      fixedPaid: (label: string) => `“${label}” is already paid this cycle.`,
      unknownType: (label: string) =>
        `I didn't know what to do with “${label}”.`,
      badAmount: (label: string) => `I didn't get the amount for “${label}”.`,
      noCategory: (amount: string) =>
        `I didn't get what the ${amount} expense was for.`,
    },
  },

  update: {
    failed: "Couldn't update. Try again.",
    available: (version: string) => `A new version is out (${version}).`,
    updating: 'Updating…',
    update: 'Update',
  },

  errors: {
    generic: 'Something went wrong. Try again.',

    // Validation
    invalidData: 'Invalid data',
    invalidId: 'Invalid id',
    nameRequired: 'Type your name',
    nameTooLong: 'Your name can be up to {max} letters',
    incomeRequired: 'Income must be more than 0',
    dayOutOfRange: 'The payday goes from 1 to 31',
    fixedNameRequired: 'Every fixed expense needs a name',
    amountsPositive: 'Amounts must be more than 0',
    categoryNameRequired: 'Every category needs a name',
    budgetNegative: "The budget can't be negative",
    categoryRepeated: 'The category "{name}" is repeated',
    amountsNotNegative: "Amounts can't be negative",
    pickTarget: 'Pick what the expense is for',
    pickTargets: 'Pick what each expense is for',
    amountRequired: 'The amount must be more than 0',
    invalidDate: 'Invalid date',

    // Data
    notLoaded: "Your data hasn't loaded yet.",
    profileFirst: 'Finish your profile first',
    saveIncomeFirst: 'Save your income first',
    onboardingDone: 'The onboarding is already complete',
    expenseNotFound: 'Expense not found',
    incomeNotFound: 'Income not found',
    fixedNotFound: 'Fixed expense not found',
    investmentElsewhere: 'The investment is edited from investments',
    investmentExists: 'You already have another investment fixed expense',
    nothingToSave: 'Nothing to save',
    currencyLocked: 'You already have records, so the currency is fixed.',

    // Backup
    backupNotJson: "The file isn't valid JSON",
    backupNotLucka: "The file isn't a Lucka backup",
    backupVersion:
      "The file is from a Lucka version this one can't read ({version})",
    backupMissing: 'The file is missing "{field}"',
    backupNoProfile: 'The file has a finished onboarding but no profile',
    backupOrphans:
      'The file has expenses without their fixed expense or category',
    backupInvestments: 'The file has more than one active investment',
    backupRow: "The file isn't valid: {reason}",

    // From Rust (src-tauri/src/error.rs)
    offline: "Can't reach {provider}. Check your internet.",
    badResponse: '{provider} answered something unexpected',
    keyRejected:
      '{provider} rejected the key. Check that it was copied right and is active.',
    modelNotFound:
      "{provider} doesn't recognize that model. Pick another one in Settings.",
    rateLimited:
      '{provider} says you hit the usage limit. Check your balance or wait a bit.',
    providerFailed: '{provider} failed ({status}). Try again.',
    refused: 'The AI refused that sentence. Try saying it another way.',
    unknownProvider: 'Unknown provider',
    invalidModel: 'Invalid model',
    emptyKey: 'Paste your key',
    keyMissing:
      "There's no {provider} key on this computer. Add it in Settings.",
    keychainFailed: "Couldn't use the system keychain",
    badFormat: "The AI didn't answer in the expected format. Try again.",
    localModelMissing: 'Download the local model in Settings first',
    localModelFailed: 'The local model failed. Try again.',
    localModelBusy: 'The local model is busy',
    localModelBroken: "Couldn't open the local model. Download it again.",
    tooLong: "That's too long. Try fewer things at a time.",
    tooShort: "I didn't hear you. Keep recording a bit longer.",
    notHeard: "I didn't hear you. Try again.",
    voiceModelMissing: 'Download the voice model in Settings first',
    voiceModelBroken: "Couldn't open the voice model. Download it again.",
    transcriptionFailed: 'The transcription failed',
    whisperBusy: 'Whisper is busy',
    alreadyRecording: "You're already recording",
    notRecording: "You weren't recording",
    micDenied: "Lucka doesn't have permission to use the microphone.",
    micBusy: 'The microphone is busy. Try again.',
    micMissing: 'No microphone found',
    micUnsupported: 'Unsupported microphone format',
    appFolderMissing: "Couldn't find the app folder",
    unknownModel: 'Unknown model',
    downloadFailed: "Couldn't download. Check your connection.",
    diskFull: "Couldn't write the model. Is there space on the disk?",
    downloadCorrupt: 'The downloaded file is damaged. Try again.',
    modelSaveFailed: "Couldn't save the model",
    modelDeleteFailed: "Couldn't delete the model",
  },
}

export type Messages = typeof en
export type ErrorCode = keyof Messages['errors']
