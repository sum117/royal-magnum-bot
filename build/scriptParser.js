import crypto from "crypto";
export default class ScriptParser {
    currentIndex = 0;
    tokens = [];
    constructor(script) {
        this.tokens = script.split(/\s+/).filter((token) => token !== "");
    }
    parse() {
        const script = {
            declarations: new Array(),
            chapters: new Array(),
        };
        let currentChapter;
        while (this.currentIndex < this.tokens.length) {
            const token = this.tokens[this.currentIndex];
            switch (token) {
                case "@declare":
                    if (!script.declarations) {
                        script.declarations = [];
                    }
                    script.declarations.push(this.parseDeclaration());
                    break;
                case "@chapter":
                    if (!script.chapters) {
                        script.chapters = [];
                    }
                    if (currentChapter) {
                        const nextChapter = this.parseChapter();
                        if (!currentChapter.choices) {
                            currentChapter.nextChapter = currentChapter.nextChapter ?? nextChapter.name;
                            currentChapter.nextChapterId = currentChapter.nextChapterId ?? nextChapter.id;
                        }
                        nextChapter.previousChapter = currentChapter.name;
                        nextChapter.previousChapterId = currentChapter.id;
                        script.chapters.push(nextChapter);
                        currentChapter = nextChapter;
                    }
                    else {
                        currentChapter = this.parseChapter();
                        script.chapters.push(currentChapter);
                    }
                    const errors = {
                        pointsToItself: currentChapter.nextChapter === currentChapter.name,
                        hasChoicesAndNextChapter: currentChapter.choices && currentChapter.nextChapter,
                    };
                    if (errors.pointsToItself) {
                        throw new Error(`Chapter "${currentChapter.name}" at index ${this.currentIndex} points to itself.`);
                    }
                    if (errors.hasChoicesAndNextChapter) {
                        throw new Error(`Chapter "${currentChapter.name}" at index ${this.currentIndex} has both choices and nextChapter.`);
                    }
                    break;
                default:
                    throw new Error(`Unexpected token "${token}", at index ${this.currentIndex}`);
            }
        }
        const chaptersWithChoices = script.chapters.map((chapter) => ({
            id: chapter.id,
            name: chapter.name,
            choices: chapter.choices,
        }));
        const updateRefs = (chapter) => {
            const previous = chaptersWithChoices.find(({ choices }) => choices?.some((choice) => choice.targetChapter === chapter.name));
            chapter.previousChapter = previous?.name ?? chapter.previousChapter;
            chapter.previousChapterId = previous?.id ?? chapter.previousChapterId;
            const next = chaptersWithChoices.find(({ name }) => name === chapter.nextChapter);
            chapter.nextChapterId = next?.id ?? chapter.nextChapterId;
            return chapter;
        };
        const updatedBackRefs = script.chapters.map(updateRefs);
        const updateChoices = (chapter) => {
            chapter.choices?.forEach((choice) => {
                const targetChapter = chaptersWithChoices.find(({ name }) => name === choice.targetChapter);
                choice.targetChapterId = targetChapter?.id ?? choice.targetChapterId;
            });
            return chapter;
        };
        const updatedChoices = updatedBackRefs.map(updateChoices);
        return {
            declarations: script.declarations,
            chapters: updatedChoices,
        };
    }
    parseDeclaration() {
        this.expectToken("@declare");
        const characterName = this.nextToken();
        this.expectToken("(");
        const sprites = {};
        while (this.peekToken() !== ")") {
            const spriteName = this.nextToken();
            this.expectToken("=");
            const spritePath = this.nextToken();
            sprites[spriteName] = spritePath;
        }
        this.expectToken(")");
        return {
            type: "declare",
            characterName,
            sprites,
        };
    }
    parseChapter() {
        this.expectToken("@chapter");
        const name = this.nextToken();
        let nextChapter;
        const hasArrow = this.peekToken() === "->";
        if (hasArrow) {
            this.expectToken("->");
            nextChapter = this.nextToken();
        }
        this.expectToken("(");
        const chapter = {
            id: crypto.randomBytes(3).toString("hex"),
            type: "chapter",
            name,
            nextChapter,
            characters: [],
            dialogues: [],
        };
        while (this.peekToken() !== ")") {
            const token = this.peekToken();
            switch (token) {
                case "@background":
                    if (!chapter.backgrounds) {
                        chapter.backgrounds = [];
                    }
                    this.expectToken("@background");
                    chapter.backgrounds.push(this.nextToken());
                    break;
                case "@character":
                    const character = this.parseCharacter(chapter);
                    chapter.characters.push(character);
                    break;
                case "@choice":
                    if (!chapter.choices) {
                        chapter.choices = [];
                    }
                    const choice = this.parseChoice();
                    choice.parentChapterId = chapter.id;
                    chapter.choices.push(choice);
                    break;
                default:
                    chapter.dialogues.push(this.parseDialogue());
                    break;
            }
        }
        this.expectToken(")");
        return chapter;
    }
    parseCharacter(chapter) {
        this.expectToken("@character");
        const [name, sprite, position] = this.nextToken().split("->");
        return {
            name,
            type: "character",
            sprite: {
                name: sprite,
                dialogueIndex: chapter.dialogues.length,
            },
            position: position,
        };
    }
    parseChoice() {
        this.expectToken("@choice");
        const targetChapter = this.nextToken();
        return { ...this.parseStringSection("choice", "label"), targetChapter };
    }
    parseDialogue() {
        const characterName = this.nextToken();
        return { ...this.parseStringSection("dialogue", "text"), characterName };
    }
    parseStringSection(type, targetProperty) {
        const tokens = [];
        for (let innerIndex = this.currentIndex; innerIndex < this.tokens.length; innerIndex++) {
            const token = this.tokens[innerIndex];
            if (token.endsWith('"')) {
                tokens.push(token);
                this.currentIndex = innerIndex + 1;
                break;
            }
            tokens.push(token);
        }
        return {
            type,
            [targetProperty]: tokens.join(" "),
        };
    }
    expectToken(token) {
        if (this.nextToken() !== token) {
            throw new Error(`Expected token "${token}", at index ${this.currentIndex}, but got "${this.peekToken()}"`);
        }
    }
    peekToken() {
        return this.tokens[this.currentIndex];
    }
    nextToken() {
        return this.tokens[this.currentIndex++];
    }
}
// const file = await readFile(path.join(process.cwd(), "src", "assets", "tutorial.rmb"), "utf-8");
// const scriptParser = new ScriptParser(file);
// const script = scriptParser.parse();
// await writeFile(path.join(process.cwd(), "src", "assets", "tutorial.json"), JSON.stringify(script));
