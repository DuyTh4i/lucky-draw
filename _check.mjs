import fs from 'node:fs'
import { parse } from '@babel/parser'

const code = fs.readFileSync('src/components/composables/usePackageOpening.js', 'utf8')
try {
  parse(code, { sourceType: 'module' })
  console.log('PARSE OK')
} catch (error) {
  console.log('PARSE ERROR:', error.message)
}
