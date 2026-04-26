import { defineStore } from 'pinia';
import type { ModalsState } from '@/types/modals.js';
import type { ModalId, IsActive } from '@/../../../types/primitives.js';

export default defineStore(`modals`, {
	state: (): ModalsState => ({
		visible: []
	}),

	actions: {
		track(id: ModalId): void {
			this.visible.push(id);
		},

		untrack(id: ModalId): void {
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
		lastOpenedById(): ModalId | undefined {
			return this.visible.at(-1);
		},
		hasVisibleModals(): IsActive {
			return this.visible.length > 0;
		}
	}
});
