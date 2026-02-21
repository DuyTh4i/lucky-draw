import { defineStore } from 'pinia'

export const useSettingStore = defineStore('rateSetting', {
  state: () => ({
    mode: 'random',
    prizePool: [
      {
        name: 'prize 1',
        quantity: 1,
        quality: 'ultra rare',
      },
      {
        name: 'prize 2',
        quantity: 1,
        quality: 'super rare',
      },
      {
        name: 'prize 3',
        quantity: 1,
        quality: 'rare',
      },
      {
        name: 'prize 4',
        quantity: 5,
        quality: 'normal',
      },
    ],
  }),
  actions: {
    addPrize (prize) {
      this.prizePool.push(prize)
    },
    removePrize (prize) {
      this.prizePool.splice(this.prizePool.indexOf(prize), 1)
    },
    updatePrize (prize) {
      this.prizePool[this.prizePool.indexOf(prize)] = prize
    },
  },
})
