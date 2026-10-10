# AnatoMe

AnatoMe helps you study anatomy. You build checklists of body part images, label them with tags, then quiz yourself on those tags or take a timed practical exam.

It was written to help my girlfriend pass Anatomy.

## Installing

AnatoMe only runs on Mac.

1. Download the latest `.dmg` from the [Releases page](https://github.com/ihernandez812/StudyHelper/releases).
2. Open it and drag AnatoMe into Applications.
3. The first time you open it, macOS will block it. The app is signed with a development certificate but not notarized by Apple. Go to System Settings, then Privacy & Security, and click Open Anyway.

After that, AnatoMe checks for updates every time it starts and installs them for you.

## Using AnatoMe

The sidebar has five screens: Home, Library, Study, Practical and Results.

### Library: build your checklists

Everything starts here. A checklist is a group of body parts, like "Upper limb".

- Click **New checklist** to create one. Use the Rename and Delete buttons to change or remove it.
- Open a checklist and click **Add body part**.
- In the body part editor:
  - Give it a name.
  - Drag an image onto the image box.
  - Right click on the image to add a tag. A tag is a label, like "Biceps".
  - Drag a tag to move it.
  - Use the zoom buttons to resize the image and the font size menu to resize the tags.
  - Edit or delete tags from the tag list.
  - Click **Save** when you are done. Nothing is kept until you save.

**Tag categories** let you say what kind of thing a tag is, like "Muscle" or "Origin". When you are quizzed, the question then asks "What is this Muscle?" instead of "What is this?". Click **Categories** at the top of the Library to add or delete them. Deleting a category removes it from any tags that used it.

### Study: quiz yourself

- Search for body parts by name, or open a checklist and pick the ones you want.
- Click **Random** on a checklist to study one body part picked at random from it.
- Click **Study selected**, then choose a difficulty:
  - **Easy**: a word bank of answers and 3 hints
  - **Medium**: a word bank, no hints
  - **Hard**: no word bank, no hints
- Each tag shows as a question mark. Click one and type the answer, or drag a word from the word bank onto it.

### Practical: take a practice exam

A practical works like a real lab exam.

1. Pick the checklists to include. Every body part in them becomes a station, in random order.
2. Pick a time limit: none, 5, 10 or 15 minutes.
3. At each station, click a question mark and type your answer. Answers are not checked until the end.

When you finish, the practical is scored and saved.

### Results: review past practicals

Results lists every practical you have taken, with its score.

- Click **Open** to go through a practical station by station. Right answers are green, wrong ones are red.
- Turn on **Show answers** to see the correct name on every tag.
- A practical keeps its own copy of each body part, so editing or deleting a checklist later does not change your results.

## For developers

### Running from source

```bash
npm install
npm start
```

### Where data lives

Everything is stored in `~/Library/Application Support/AnatoMe/`:

- `anatome.db`: a SQLite database with all checklists, body parts, tags, categories, practicals and settings
- `images/`: the body part images. Checklist images are in `images/checklists/`, and each practical keeps copies in `images/practicals/`.

Logs are in `~/Library/Logs/AnatoMe/main.log`.

### Changing the database

Database changes are made by upgrade tasks. They run when the app starts, before any window opens.

To add one:

1. Add the new version to `src/main/upgrades/upgradeVersions.js`.
2. Create a folder `src/main/upgrades/v<version>/`.
3. In it, add one class per task. Each class extends `UpgradeTask` and does its work in `upgrade()`.
4. Add a `v<version>UpgradeFactory` that lists those tasks in order.
5. Add the factory to `VERSION_UPGRADE_FACTORY_LIST` in `upgradeFactory.js`.

The app remembers the last version it upgraded to. On every start it runs that version again plus every newer version, up to the app's own version. So **every task must be safe to run more than once**. For example:

- Use `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Use `INSERT OR IGNORE` when adding rows.
- SQLite has no `ADD COLUMN IF NOT EXISTS`, so check `PRAGMA table_info` before `ALTER TABLE ... ADD COLUMN`.

If a task fails, the app shows an error and closes. Nothing is marked as done, so it tries again on the next start.

### Releasing

1. One time only: run `gh auth login`. The token is kept in the macOS Keychain, never in this repo.
2. Raise `version` in `package.json`.
3. Run `npm run deploy`. This builds the app and publishes a GitHub release.
4. Installed copies find the update the next time they start.

To test the updater from source, set `version` in `package.json` lower than the latest release, then run:

```bash
UPDATER_DEV=1 npm start
```
