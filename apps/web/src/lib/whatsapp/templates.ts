/**
 * Bilingual WhatsApp message templates (NFR-13).
 * All user-facing strings for the booking flow live here.
 */

export type Lang = 'en' | 'hi'

export const t = {
  consent: (clinicName: string, lang: Lang): string =>
    lang === 'hi'
      ? `Namaste! Main aapko ${clinicName} mein appointment book karne mein madad karunga. Shuru karne se pehle, mujhe aapka naam aur umra chahiye. Kya aap tayaar hain? YES reply karein.`
      : `Hi! I'm here to help you book an appointment at ${clinicName}. Before we start, I'll need your name and age to create your record. Ready to continue? Please reply YES.`,

  consentButton: (lang: Lang): string => (lang === 'hi' ? 'हाँ' : 'YES'),

  askName: (lang: Lang): string =>
    lang === 'hi' ? 'Acha! Aapka naam kya hai?' : 'Great! What is your name?',

  invalidName: (lang: Lang): string =>
    lang === 'hi'
      ? 'Kripya apna naam darj karein (sirf akshar).'
      : 'Please enter your name (letters only).',

  giveUp: (clinicPhone: string, lang: Lang): string =>
    lang === 'hi'
      ? `Pareshani ho rahi hai? Appointment book karne ke liye humare yahan call karein: ${clinicPhone}. Aapka din shubh ho!`
      : `Having trouble? Please call us at ${clinicPhone} to book your appointment. Have a great day!`,

  askAge: (name: string, lang: Lang): string =>
    lang === 'hi' ? `Shukriya, ${name}! Aapki umra kya hai?` : `Thanks, ${name}! How old are you?`,

  ageButtons: (): Array<{ id: string; title: string }> => [
    { id: 'age_under18', title: 'Under 18' },
    { id: 'age_18_35', title: '18–35' },
    { id: 'age_36_55', title: '36–55' },
    { id: 'age_56plus', title: '56+' },
  ],

  // Only 3 buttons allowed per WhatsApp quick reply — age uses 2 messages
  ageButtons1: (): Array<{ id: string; title: string }> => [
    { id: 'age_under18', title: 'Under 18' },
    { id: 'age_18_35', title: '18–35' },
    { id: 'age_36_55', title: '36–55' },
  ],
  ageButtons2: (): Array<{ id: string; title: string }> => [
    { id: 'age_56plus', title: '56+' },
  ],

  askGender: (lang: Lang): string =>
    lang === 'hi' ? 'Aur aapka gender?' : 'And your gender?',

  genderButtons: (): Array<{ id: string; title: string }> => [
    { id: 'gender_male', title: 'Male' },
    { id: 'gender_female', title: 'Female' },
    { id: 'gender_other', title: 'Other' },
  ],

  slotListHeader: (lang: Lang): string =>
    lang === 'hi' ? 'Appointment time chuniye:' : 'Pick an appointment time:',

  slotListBody: (lang: Lang): string =>
    lang === 'hi' ? 'Uplabdh slots:' : 'Available slots:',

  slotListButton: (lang: Lang): string =>
    lang === 'hi' ? 'Samay dekhein' : 'See available times',

  noSlots: (clinicPhone: string, lang: Lang): string =>
    lang === 'hi'
      ? `Abhi koi appointment uplabdh nahi hai. Kripya humare yahan call karein: ${clinicPhone}.`
      : `No appointments available right now. Please call us at ${clinicPhone}.`,

  slotTaken: (lang: Lang): string =>
    lang === 'hi'
      ? 'Yeh slot abhi le liya gaya. Yahan agle uplabdh samay hain:'
      : 'That slot was just taken. Here are the next available times:',

  afterHoursPrefix: (hours: string, lang: Lang): string =>
    lang === 'hi'
      ? `Hum abhi band hain. Hamara samay ${hours} hai. Yahan hamare jaldi uplabdh slots hain:`
      : `We're currently closed. Our timings are ${hours}. Here are our earliest available slots:`,

  welcomeBack: (firstName: string, lang: Lang): string =>
    lang === 'hi'
      ? `Namaste, ${firstName}! Kya aap phir se appointment book karna chahte hain?`
      : `Welcome back, ${firstName}! Book another appointment?`,

  welcomeBackUnnamed: (lang: Lang): string =>
    lang === 'hi'
      ? 'Aapka swagat hai! Kya aap appointment book karna chahte hain?'
      : 'Welcome back! Would you like to book an appointment?',

  bookNow: (lang: Lang): string => (lang === 'hi' ? 'Haan, book karein' : 'Yes, book now'),
  noThanks: (lang: Lang): string => (lang === 'hi' ? 'Nahi, shukriya' : 'No, thanks'),

  bookingDeclined: (lang: Lang): string =>
    lang === 'hi'
      ? 'Koi baat nahi! Jab chahein appointment book karne ke liye message karein.'
      : 'No problem! Feel free to message us anytime to book. Take care!',

  cancelFound: (
    date: string,
    time: string,
    doctorName: string,
    lang: Lang
  ): string =>
    lang === 'hi'
      ? `Aapki appointment ${date} ko ${time} baje Dr. ${doctorName} ke saath cancel ho gayi.`
      : `Your appointment on ${date} at ${time} with Dr. ${doctorName} has been cancelled.`,

  cancelNotFound: (lang: Lang): string =>
    lang === 'hi'
      ? "Hume koi aane wali appointment nahi mili. Kya aap nai appointment book karna chahte hain?"
      : "We don't see any upcoming appointment to cancel. Did you mean to book a new appointment?",

  optOut: (lang: Lang): string =>
    lang === 'hi'
      ? 'Aapko appointment messages se unsubscribe kar diya gaya hai. Phir se subscribe karne ke liye START reply karein.'
      : "You've been unsubscribed from appointment messages. To re-subscribe, reply START.",

  trialExpired: (clinicPhone: string, lang: Lang): string =>
    lang === 'hi'
      ? `Online booking abhi uplabdh nahi hai. Appointment book karne ke liye humare yahan call karein: ${clinicPhone}.`
      : `Online booking is temporarily unavailable. Please call us at ${clinicPhone} to book.`,

  confirmationEn: (
    firstName: string,
    token: number,
    doctorName: string,
    dateStr: string,
    timeStr: string,
    clinicName: string,
    address: string
  ): string =>
    `Appointment confirmed! Token #${token}, Dr. ${doctorName}, ${dateStr} ${timeStr}, ${clinicName}, ${address}. Booked by ${firstName}.`,

  confirmationHi: (
    firstName: string,
    token: number,
    doctorName: string,
    dateStr: string,
    timeStr: string,
    clinicName: string,
    address: string
  ): string =>
    `Appointment confirm ho gayi! Token #${token}, Dr. ${doctorName}, ${dateStr} ${timeStr}, ${clinicName}, ${address}. ${firstName} ke liye book hua.`,
}

/** Age range ID → label map */
export const AGE_RANGE_MAP: Record<string, string> = {
  age_under18: 'Under 18',
  age_18_35: '18-35',
  age_36_55: '36-55',
  age_56plus: '56+',
}

/** Gender ID → label map */
export const GENDER_MAP: Record<string, string> = {
  gender_male: 'Male',
  gender_female: 'Female',
  gender_other: 'Other',
}
