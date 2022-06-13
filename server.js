const express = require('express')
const axios = require('axios');
const { Chess } = require('./node_modules/chess.js')
const Engine = require('node-uci').Engine

const app = express()

app.use(express.json())
app.use(express.static('public'))


app.post('/api/compute', (req, res) => {
    
    const url = `https://api.chess.com/pub/player/${req.body.id}/games/archives`

    axios.get(url)
    .then(function(response){
        //console.log(response.data.archives);        
        const month = response.data.archives[0]
        
        axios.get(month)
        .then(function(nextResponse){
                 
            const getGamesPlayed = () => {
                
                const gameFens = {
                    white : [],
                    black : [],
                };

                const gamesLog = nextResponse.data.games
                const chess = new Chess()
                
                for (i=0; i<gamesLog.length; i++){
                    let fenObject = {
                        position: {},
                        response: {}
                    }
                    let gamePGN = gamesLog[i].pgn;
                    chess.load_pgn(gamePGN)
    
                    const listOfMoves = chess.history()
                    chess.reset()
                    
                    if (gamesLog[i].white.username == req.body.id){
                        for (j=0; j<listOfMoves.length; j+= 1){
                            chess.move(listOfMoves[j])
        
                            if (j % 2 == 1){
                                fenObject.position[`id ${j}`] = chess.fen()
                            }else{
                                fenObject.response[`id ${j - 1}`] = chess.fen()
                            }
                            
                        }
                        gameFens.white.push(fenObject)
                    }else{
                        for (j=0; j<listOfMoves.length; j+= 1){
                            chess.move(listOfMoves[j])
        
                            if (j % 2 == 0){
                                fenObject.position[`id ${j}`] = chess.fen()
                            }else{
                                fenObject.response[`id ${j - 1}`] = chess.fen()
                            }
                            
                        }
                        gameFens.black.push(fenObject)
                    }             
                }
                //console.log(gameFens.black[0].position)
                //console.log('response:', gameFens.black[0].response)
                return gameFens
            }

            const getEnginePositions = async (games) => {

                const enginePositions = {
                    white: {},
                    black: {}
                }

                const enginePath = './stockfish_14.1_win_x64_popcnt/stockfish_14.1_win_x64_popcnt.exe';
                const engine = new Engine(enginePath)

                await engine.init()
                await engine.setoption('MultiPV', '1')
                await engine.isready()

                for (const whiteGame of games.white){

                    const game = {
                        position: [],
                        player: [],
                        computer: []
                    }

                    const positionKeys = Object.keys(whiteGame.position)
                    let index = 1

                    for (const key of positionKeys){
                        
                        const gamePosition = whiteGame.position[key] 

                        await engine.position(gamePosition)
                        const engineMove = await engine.go({depth: 3})

                        const chess = new Chess(gamePosition)
                        if (engineMove.bestmove != '(none)'){
                            chess.move({
                                from: engineMove.bestmove.slice(0, 2),
                                to: engineMove.bestmove.slice(2, 4)
                            })
                            //console.log(engineMove.bestmove.slice(0, 2), engineMove.bestmove.slice(2, 4))    
                            //console.log(`initial pos white: ${gamePosition}, best move: ${engineMove.bestmove}, com pos: ${chess.fen()}`)
                            game.position.push(gamePosition)
                            game.player.push(whiteGame.response[key])
                            game.computer.push(chess.fen())
                        }
                        enginePositions.white[`game ${index}`] = game            
                        index ++            
                    }
                }

                for (const blackGame of games.black){

                    const game = {
                        position: [],
                        player: [],
                        computer: []
                    }

                    const positionKeys = Object.keys(blackGame.position)
                    let index = 1

                    for (const key of positionKeys){

                        const gamePosition = blackGame.position[key] 

                        await engine.position(gamePosition)
                        const engineMove = await engine.go({depth: 3})

                        const chess = new Chess(gamePosition)
                        if (engineMove.bestmove != '(none)'){
                            chess.move({
                                from: engineMove.bestmove.slice(0, 2),
                                to: engineMove.bestmove.slice(2, 4)
                            })
                            //console.log(engineMove.bestmove.slice(0, 2), engineMove.bestmove.slice(2, 4))
                            //console.log(`initial pos black: ${gamePosition}, best move: ${engineMove.bestmove}, com pos: ${chess.fen()}`)
                            game.position.push(gamePosition)
                            game.player.push(blackGame.response[key])
                            game.computer.push(chess.fen())
                        } 
                        enginePositions.black[`game ${index}`] = game
                        index++  
                    }

                }
                //console.log(enginePositions)
                //console.log(enginePositions.white['game 1'])
                await engine.quit()
                return enginePositions
            }
            
            const getBlunders = async (gameData) => {

                const blunders = {}

                const enginePath = './stockfish_14.1_win_x64_popcnt/stockfish_14.1_win_x64_popcnt.exe';
                const engine = new Engine(enginePath)

                await engine.init()
                await engine.setoption('MultiPV', '1')
                await engine.isready()

                const whiteGames = gameData.white
                const blackGames = gameData.black

                const whiteGameKeys = Object.keys(whiteGames)
                const blackGameKeys = Object.keys(blackGames)
                
                let playerResponseScore;
                let computerResponseScore;

                for (key of whiteGameKeys){
                    let move = 1;
                    for (i=0; i<whiteGames[key].player.length; i++){
           
                        const playerResponse = whiteGames[key].player[i]
                        const computerResponse = whiteGames[key].computer[i]

                        if (playerResponse){
                            await engine.position(playerResponse) 
                            const playerResponseResult = await engine.go({depth: 3})
                            await engine.position(computerResponse) 
                            const computerResponseResult = await engine.go({depth: 3})

                            playerResponseScore = playerResponseResult.info[playerResponseResult.info.length - 1].score.value
                            computerResponseScore = computerResponseResult.info[computerResponseResult.info.length - 1].score.value
                        }else{
                            playerResponseScore = 0
                            computerResponseScore = 0

                        }                      
                        
                        //console.log(key)
                        //console.log(`player score ${playerResponseScore}, computer score ${computerResponseScore}`)
                        if ((Math.abs(playerResponseScore) - Math.abs(computerResponseScore) <= -2)){
                            if (blunders[move]){
                                blunders[move] = blunders[move] + 1
                            }else{
                                blunders[move] = 1
                            }
                        }
                        move++
                    }
                }
                
                for (key of blackGameKeys){
                    let move = 1;
                    for (i=0; i<blackGames[key].player.length; i++){
                        
                        const playerResponse = blackGames[key].player[i]
                        const computerResponse = blackGames[key].computer[i]

                        if (playerResponse){
                            await engine.position(playerResponse) 
                            const playerResponseResult = await engine.go({depth: 3})
                            await engine.position(computerResponse) 
                            const computerResponseResult = await engine.go({depth: 3})

                            playerResponseScore = playerResponseResult.info[playerResponseResult.info.length - 1].score.value
                            computerResponseScore = computerResponseResult.info[computerResponseResult.info.length - 1].score.value
                        }else{
                            playerResponseScore = 0
                            computerResponseScore = 0

                        }                      
                        
                        //console.log(key)
                        //console.log(`player score ${playerResponseScore}, computer score ${computerResponseScore}`)
                        if ((Math.abs(playerResponseScore/100) - Math.abs(computerResponseScore/100) <= -2)){
                            if (blunders[move]){
                                blunders[move] = blunders[move] + 1
                            }else{
                                blunders[move] = 1
                            }
                        }
                        move++
                    }
                }
                return blunders

            }

            const gameFens = getGamesPlayed()
            getEnginePositions(gameFens).then(enginePositions => {
                getBlunders(enginePositions).then(data => {
                    console.log(data)
                    res.json(data)
                })
            })           
        })
        .catch(function(error){
            console.log(error);
        })    
    })
    .catch(function(error){
        console.log(error);
    })
});

const port = process.env.PORT || 3000;
app.listen(port)