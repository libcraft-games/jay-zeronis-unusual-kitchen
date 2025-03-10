<script lang="ts">
import { computed, defineComponent, ref } from 'vue';
import { SAVE_STATE_KEY, useGameStateStore } from '../store';

export default defineComponent({
  name: 'Options',
  setup(_props, _context) {
    const store = useGameStateStore();

    const hardResetGame = () => {
      if (confirm('This will permanently erase ALL your progress, nothing will be persisted. Are you absolutely sure you want to reset your game?')) {
        store.hardReset();
      }
    };

    const lastSaveAt = computed(() => store.lastSaveAt);
    const debugMode = computed(() => store.debugMode);
    const toggleDebugMode = () => store.toggleDebugMode();
    const saveGame = () => store.save();
    const exportButtonText = ref('Export Save (copies to clipboard)');

    const importToggled = ref(false);
    const toggleImportTextArea = () => {
      importToggled.value = !importToggled.value;
    };
    const importedSaveText = ref('');
    const importSave = () => {
      toggleImportTextArea();
      try {
        let importedSaveObj = JSON.parse(atob(importedSaveText.value));
        store.replaceState(importedSaveObj);
        importedSaveText.value = '';
      } catch (error) {
        alert('There was an error with the imported save data. Are you sure you have a valid save?');
      }
    };

    const exportSave = () => {
      let saveText = localStorage.getItem(SAVE_STATE_KEY);
      if (saveText === null) {
        return;
      }
      navigator.clipboard.writeText(btoa(saveText)).then(() => {
        exportButtonText.value = 'Copied!';
        setTimeout(() => {
          exportButtonText.value = 'Export Save (copies to clipboard)';
        }, 2000);
      });
    };

    return {
      hardResetGame,
      lastSaveAt,
      debugMode,
      toggleDebugMode,
      importSave,
      importedSaveText,
      toggleImportTextArea,
      importToggled,
      exportButtonText,
      exportSave,
      saveGame
    };
  },
});
</script>

<template>
  <div>
    <h4>Options</h4>
    <div class="buttons">
      <button type="button" @click="saveGame">
        Save Game
      </button>
      <button type="button" @click="toggleImportTextArea">
        {{ importToggled ? 'Close Import Field' : 'Import Save' }}
      </button>
      <div class="import-text-area-container" v-show="importToggled">
        <textarea
          placeholder="Paste save game data here and hit Enter"
          v-on:keypress.enter="importSave"
          v-model="importedSaveText"
        ></textarea>
      </div>
      <button type="button" :disabled="lastSaveAt === null" @click="exportSave">
        {{ exportButtonText }}
      </button>
      <button type="button" @click="hardResetGame">
        Hard Reset
      </button>
      <button type="button" @click="toggleDebugMode">
        {{ debugMode === true ? 'Disable Debug Mode' : 'Enable Debug Mode' }}
      </button>
    </div>
    <p>Game by Connor Shea | <a href="https://github.com/connorshea/teashop">GitHub</a></p>
  </div>
</template>

<style scoped lang="scss">
a {
  color: #42b983;
}

label {
  margin: 0 0.5em;
  font-weight: bold;
}

code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}

.buttons {
  display: flex;
  flex-flow: row wrap;
  margin: auto;
  width: 250px;

  button {
    margin: auto;
    margin-top: 5px;
    display: block;
    width: 250px;
  }
}

.import-text-area-container {
  width: 100%;
}

textarea {
  resize: none;
  width: inherit;
}
</style>
