// TicTacPonzi Contract for Blockchain@Berkeley.
// Copyright (c) 2017 Nicolas Zoghb. Released under the MIT License.
// Version 1.0.0, 15 July 2017.

pragma solidity ^0.4.0;

contract TicTacPonzi {

	address payee;
	address challenger;
	mapping (address => uint) public balances;
	Game current_game;

	// Events to be called when the Game begins and ends.
	// Used in: start(), check().
	event gameStart(address first, address second);
	event gameEnd(address first, address second, uint outcome,
		uint payee_profit);

	// Make sure the caller is inputting a positive amount of money into the
	// pot.
	// Used in: start(), challenge().
	modifier hasValue { if(msg.value > 0) _ }

	// Use this mod on functions that require msg to be the current Payee.
	// Used in: .
	modifier isPayee { if (msg.sender == payee) _ }

	// Make sure there is only one game active at any one time.
	// Used in: start().
	modifier issueGame { if (current_game.active == false) _ }

	// Make sure there is a Payee to challenge.
	// Used in: challenge().
	modifier issueChallenge { if (current_game.num_players == 1) _ }

	// The board is a two-dimensional array/mapping, which works best?
	struct Game {
		bool active = false;
        uint pot;
        uint turn; 
        address payee;
        address challenger
        uint num_players;
        uint time_limit;
        mapping(uint => mapping(uint => uint)) board;
        // private uint[][] board = []
    }



    // Only Payee can start a game and must put in a positive amount of money
    // in the pot
    function TicTacPonzi() hasValue issueGame {
        if (!current_game.length) {
        	payee = msg.sender;
        	current_game = Game(True, msg.value, 0, msg.sender, 0, 1, 60, ...);
        	current_game.active = true
            msg.value = 0;
        	}
        }
    }

    // Only the Challenger can challenge a Payee and must pay in x1.1 whatever
    // the Payee put in the pot.
    function challenge() has_value issueChallenge {
    	if (msg.sender != payee)
    		challenger = msg.sender;
    		gameStart(payee, challenger);
    }

    // Allows current players to inset their tokens onto the board.
    // Payee tokens are represented as '0' and Challenger tokens as 
    // '1'.
    function play(address player, uint row, uint column) {
        if (msg.sender == payee) && (current_game.turn == 0) {
        	if check(0, row, column) {

        	}
        	current_game.turn = 1;
        }
        if (msg.sender == challenger) && (current_game.turn == 1) {
        	if check(1, row, column) {

        	}
        	current_game.turn = 1;
        }
    }

    // Check if a move is valid and whether that move wins the game.
    function check(uint token, uint row, uint column) {

    }

    // Allow anyone to check on the state of the game and the moves everyone
    // has made so far.
    function get_state(address host) returns (uint _pot, uint _turn,
    	address _payee, address _challenger, uint _time_limit, uint row1,
    	uint row2, uint row3) {
        _pot = current_game.pot;
        _opposition = current_game.challenger;
        _time_limit = current_game.time_limit;
        _turn = current_game.turn;
        row1 = (100 * (current_game.board[0][0] + 1)) +
        (10 * (current_game.board[0][1]) + (current_game.board[0][2]);
        row2 = (100 * (current_game.board[1][0] + 1)) + 
        (10 * (current_game.board[1][1])) + (current_game.board[1][2]);
        row3 = (100 * (current_game.board[2][0] + 1)) +
        (10 * (current_game.board[2][1])) + (current_game.board[2][2]);
    }

}