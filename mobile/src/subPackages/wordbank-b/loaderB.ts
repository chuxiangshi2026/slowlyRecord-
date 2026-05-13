import type { Word, WordBankType } from '@/stores/useUtils'
import toefl from './wordbanks/toefl'
import gre from './wordbanks/gre'
import sat from './wordbanks/sat'
import level4 from './wordbanks/level4'
import bec from './wordbanks/bec'
import cet4 from './wordbanks/cet4'
import ielts from './wordbanks/ielts'
import cet6 from './wordbanks/cet6'
import kaogong from './wordbanks/kaogong'
import zsb from './wordbanks/zsb'

const data: Partial<Record<WordBankType, any[]>> = {
  toefl, gre, sat, level4, bec, cet4, ielts, cet6, kaogong, zsb,
}

export function loadWordBankB(type: WordBankType): Word[] {
  const rawData = data[type]
  if (!rawData) throw new Error(`分包B中无词库: ${type}`)
  return (Array.isArray(rawData) ? rawData : []).map((w: any) => ({
    word: w.word || '',
    meaning: w.meaning || w.explains || '',
    phonetic: w.phonetic,
    example: w.example,
  }))
}

export const WORDBANK_B_IDS: WordBankType[] = ['toefl', 'gre', 'sat', 'level4', 'bec', 'cet4', 'ielts', 'cet6', 'kaogong', 'zsb']
