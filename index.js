#!/usr/bin/env node
const Game        = require('./lib/Game');
const chalk       = require('chalk');
const figlet      = require('figlet');
const inquirer    = require('inquirer');
const { Spinner } = require('clui');

const { HELPER, INSTRUCTIONS } = require('./utils/instructions');
const { isCoordinateValid }    = require('./utils/validateCoords');
const { P1_SHIPS }             = require('./utils/keys');

/** TODO:
  * add more messages for hits and misses and randomize
**/

// instantiate Game class
var game = new Game();

/* Clears Term & ASCII ART! */
function clearTerm(menuCallback, init) {
    process.stdout.write('\x1Bc');
    console.log(
        chalk.cyan(
            figlet.textSync('Battleship CLI', {
                font: 'graffiti',
                horizontalLayout: 'full'
            }),
            '\n'
        )
    );

    init ? menuCallback('init') : menuCallback();
}

/* GAME PROMPTS: */
function mainMenu(init) {
    const WELCOME = ' Welcome to Battleship CLI!';
    const NOTE = chalk.dim(' (Note: if your terminal does not support Emojis, please turn off Emoji support in settings)');
    const MENU = ' Battleship CLI Menu:';
    const MESSAGE = !init ? MENU : WELCOME + NOTE;

    const question = [
        {
            type: 'list',
            name: 'selection',
            message: MESSAGE,
            choices: [' Let\'s Play!', ' See Instructions', ' Settings', ' Exit'],
            default: 0
        }
    ];

    inquirer.prompt(question).then(menu => {
        switch (menu.selection) {
            case ' See Instructions':
                console.log(INSTRUCTIONS)
                __continue(() => {
                    clearTerm(mainMenu);
                });
                break;
            case ' Settings':
                clearTerm(settingsMenu);
                break;
            case ' Exit':
                console.log('\n\nGoodbye...\n\n');
                process.exit();
                break;
            default:
                if (game.cpu.ownBoard === null) {
                    game.drawBoards(10);
                }
                game.populateP1Ships();
                configureP1Ships(P1_SHIPS);
        }
    });
}

function settingsMenu() {
    const questions = [
        {
            type: 'list',
            name: 'selection',
            message: ' Settings:',
            choices: [ ' Emoji Board', ' Board Size', ' Difficulty', ' Main Menu'],
            default: 3
        },
        {
            type: 'list',
            name: 'emoji',
            message: ' Emoji Board:',
            choices: [' On', ' Off'],
            default: 0
        },
        {
            type: 'list',
            name: 'boardSize',
            message: ' Board Size:',
            choices: [' 10x10', ' 12x12', ' 15x15', ' 20x20'],
            default: 0
        },
        {
            type: 'list',
            name: 'difficulty',
            message: ' Difficulty:',
            choices: [' Hard (default)', ' Medium', ' Easy', ' Super Easy'],
            default: 0
        },
    ];
    inquirer.prompt(questions[0]).then(menu => {
        switch (menu.selection) {
            case ' Emoji Board':
                inquirer.prompt(questions[1]).then(option => {
                    if (option.emoji === ' On') {
                        game.emojiBoard = true;
                    } else {
                        game.emojiBoard = false;
                    }
                    clearTerm(settingsMenu);
                });
                break;
            case ' Board Size':
                inquirer.prompt(questions[2]).then(option => {
                    switch (option.boardSize) {
                        case ' 12x12':
                            game.drawBoards(12);
                            game.lastCoord = 'L12'
                            break;
                        case ' 15x15':
                            game.drawBoards(15);
                            game.lastCoord = 'O15'
                            break;
                        case ' 20x20':
                            game.drawBoards(20);
                            game.lastCoord = 'T20'
                            break;
                        default:
                            game.drawBoards(10);
                    }
                    clearTerm(settingsMenu);
                });
                break;
            case ' Difficulty':
                inquirer.prompt(questions[3]).then(option => {
                    switch (option.difficulty) {
                        case ' Super Easy':
                            game.cpu.difficulty = 0;
                            break;
                        case ' Easy':
                            game.cpu.difficulty = 1;
                            break;
                        case ' Medium':
                            game.cpu.difficulty = 2;
                            break;
                        default:
                            game.cpu.difficulty = 3;
                    }
                    clearTerm(settingsMenu);
                });
                break;
            default:
                clearTerm(mainMenu);
        }
    });
}

function configureP1Ships(ships) {
    if (ships.length === 5) {
        console.log(HELPER + '\n' + game.playerOne.board + '\n');
    }

    const INSTRUCTION =
    ` Ships remaining [type, size]: ${chalk.dim(JSON.stringify(ships).replace(/"/g, "'"))}` +
    (ships.length === 5 ? `\n   Use coordinates A1-${game.lastCoord} and left, right, up or down\n` : '\n') +
    `   Place a ship! ${chalk.dim('e.g. cruiser b3 right')}`;

    const question = [
        {
            type: 'input',
            name: 'configureShip',
            message: INSTRUCTION,
            validate: value => {
                return commandCenter(value, () => {
                    const directive = value.replace(/\s+/g, ' ').split(' ');

                    if (directive.length !== 3) {
                        return `Please provide a ship, a starting coordinate, and a direction. e.g. ${chalk.keyword('salmon')('Battleship B5 Right')}`;
                    }

                    var [ ship, coords, direction ] = directive;

                    // if ship placement is successful,
                    // playerOne.configureShip returns undefined
                    var message = game.playerOne.configureShip(
                        ship.toLowerCase(),
                        coords.toLowerCase(),
                        direction.toLowerCase()
                    );
                    // return error message or continue
                    return message ? message : true;
                });
            }
        }
    ];
    // recurse until all ships are placed
    inquirer.prompt(question).then(() => {
        if (ships.length === 1) {
            clearTerm(() => {
                console.log(HELPER + '\n' + game.playerOne.board + '\n');
                game.setInitialState();
                startGame();
            });
        } else {
            ships = [];
            for (let ship of game.playerOne.ships) {
                if (!ship.placed) {
                    ships.push(
                        ship.type.slice(0,1).toUpperCase() +
                        ship.type.slice(1) + ', ' +
                        ship.size
                    );
                }
            }

            clearTerm(() => {
                console.log(HELPER + '\n' + game.playerOne.board + '\n');
                configureP1Ships(ships);
            });
        }
    })
}

function startGame() {
    const question = [
        {
            type: 'input',
            name: 'ready',
            message: ` Ready to play? ${game.message} ${chalk.dim('(press enter to continue)')}`,
            validate: val => {
                return commandCenter(val, () => {
                    return true;
                });
            }
        }
    ];

    inquirer.prompt(question).then(() => {
        if (!game.coinToss) {
            clearTerm(() => {
                console.log(HELPER);
                takeCpuTurn();
            });
        } else {
            clearTerm(() => {
                console.log(HELPER + '\n' + game.playerOne.board + '\n');
                takeP1Turn();
            });
        }
    })
}

function takeP1Turn() {
    if (game.gameOver) {
        return gameOver();
    }

    const question = [
        {
            type: 'input',
            name: 'coords',
            message: ` Take a guess! Enter coordinates A1-${game.lastCoord}: ${chalk.dim('(e.g. B7)')}`,
            validate: value => {
                return commandCenter(value, () => {
                    if (isCoordinateValid(value, game.boardSize)) {
                        return true;
                    } else {
                        return "Please enter valid coordinates"
                    }
                });
            }
        }
    ];

    inquirer.prompt(question).then(move => {
        clearTerm(() => {
            console.log(HELPER);
            const spinner = new Spinner('');
            spinner.start();
            setTimeout(() => {
                spinner.stop();
                game.attack(move.coords);
                __continue(() => {
                    takeCpuTurn();
                });
            }, 500);
        });
    });
}

function takeCpuTurn() {
    clearTerm(() => {
        console.log(HELPER);
        const spinner = new Spinner('');
        spinner.start();
        setTimeout(() => {
            spinner.stop();
            game.attack();
            spinner.start();
        }, 500);
        setTimeout(() => {
            spinner.stop();
            takeP1Turn();
        }, 1000);
    });
}

function gameOver() {

    const question = [
        {
            type: 'list',
            name: 'newGame',
            message: game.message,
            choices: [' Yes!', ' Main Menu', ' Exit'],
            default: 0
        }
    ];

    inquirer.prompt(question).then(answer => {
        const spinner = new Spinner('');
        switch (answer.newGame) {
            case ' Yes!':
                console.log('   Ready? Here we go again...');
                spinner.start();
                setTimeout(() => {
                    spinner.stop();
                    clearTerm(() => {
                        game.reset();
                        game.populateP1Ships();
                        configureP1Ships(P1_SHIPS);
                    });
                }, 1000);
                break;
            case ' Main Menu':
                clearTerm(mainMenu);
                game = new Game();
                break;
            default:
                console.log('\n\nThanks for playing Battleship CLI! Goodbye!\n\n');
                process.exit();
        }
    });
}

/* UTILITY FUNCTIONS: */
function commandCenter(value, validations) {
    switch (value) {
        case 'help':
            return INSTRUCTIONS;
        case 'show score':
            return game.status;
        case 'q':
        case 'quit':
            console.log('\n\nGoodbye...');
            process.exit();
        default:
            return validations();
    }
}

function __continue(callback) {
    const question = [
        {
            type: 'input',
            name: 'continue',
            message: ' Press enter to continue',
            validate: value => {
                return commandCenter(value, () => {
                    return true;
                });
            }
        }
    ];

    inquirer.prompt(question).then(callback);
}

/* EXECUTE PROGRAM: */
clearTerm(mainMenu, 'init');

module.exports = game;
