// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'

import { searchItems } from '@/lib/game-data'
import type { CraftProfit } from '@/types/profit'

import { RecipeChecklist } from '../recipe-checklist'

afterEach(cleanup)

const greedo = searchItems('Greedo Rum')[0]
const kido = searchItems('Kido Beak')[0]
const edelweiss = searchItems('Edelweiss')[0]

function profit(priced: readonly number[]): CraftProfit {
  return {
    lines: [greedo, kido, edelweiss].map((item) => ({
      itemId: item.id,
      quantity: 1,
      unitPrice: priced.includes(item.id) ? 100 : undefined,
    })),
    missingPriceCount: 3 - priced.length,
    tiers: [],
  }
}

it('counts what is priced and names what is still missing', () => {
  render(<RecipeChecklist profit={profit([greedo.id])} />)

  expect(screen.getByText('1 of 3 ingredients priced')).toBeTruthy()
  expect(screen.getByText(`${kido.name}, ${edelweiss.name}`)).toBeTruthy()
})

it('offers to copy a single remaining name', () => {
  render(<RecipeChecklist profit={profit([greedo.id, kido.id])} />)

  expect(screen.getByRole('button', { name: 'Copy name' })).toBeTruthy()
})

it('disappears once every ingredient has a price', () => {
  const { container } = render(
    <RecipeChecklist profit={profit([greedo.id, kido.id, edelweiss.id])} />,
  )

  expect(container.firstChild).toBeNull()
})

it('stays out of the way of a recipe with no lines', () => {
  const { container } = render(
    <RecipeChecklist profit={{ lines: [], missingPriceCount: 0, tiers: [] }} />,
  )

  expect(container.firstChild).toBeNull()
})
