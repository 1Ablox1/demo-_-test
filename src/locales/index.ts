import { createI18n } from 'vue-i18n'
import en_US from './en_US'
import zh_CN from './zh_CN'

export const i18n = createI18n({
  legacy: false,
  locale: 'en_US',
  fallbackLocale: 'en_US',
  messages: {
    en_US,
    zh_CN,
  },
})
