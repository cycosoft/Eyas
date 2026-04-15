import { defineStore } from 'pinia';
import type { ModalsState } from '@/types/modals.js';

export default defineStore(`modals`, {
	state: (): ModalsState => ({
		visible: []
	}),

	actions: {
		track(id: string) {
			this.visible.push(id);
		},

		untrack(id: string) {
			// get the index of the id
			const index = this.visible.indexOf(id);

			// if id is in the list
			if (index > -1) {
				// remove the id from the list
				this.visible.splice(index, 1);
			}
		}
	},

	getters: {
		lastOpenedById(): string | undefined {
			return this.visible.at(-1);
		}
	}
});
