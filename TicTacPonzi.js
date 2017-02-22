//	TicTacPonzi Contract for Blockchain@Berkeley.
//	Copyright (c) 2017 Nicolas Zoghb (IoT Agriculture Team).
//  Released under the MIT License.
//	Version 1.1.0, 22 February 2017 (Started: 15 February 2017).

pragma solidity ^0.4.0;

contract TicTacPonzi {

	//	PREAMBLE

	mapping (address => uint) public balances;
	Game current_game;

	/*
	Events to be called when the Game begins and ends.
	Used in: TicTacPonzi(), check().
	*/
	event gameStart(address first, address second);
	event gameEnd(address first, address second, uint outcome,
		uint payee_profit);
	event playerWithdrawal(address player, uint amount);

	/*
	Make sure certain conditions are met before executing functions.
	Used in: TicTacPonzi(), challenge().
	*/
	modifier hasValue { if (msg.value > 0) _ }
	modifier gameActive (bool _active) 
		{ if (current_game.active == _active) _ }

	/*
	Data structure representing the game. Contains all temporary variables.
	*/
	struct Game {
		bool active;
		address payee;
		address challenger;
		uint pot;
		uint turn;
		uint num_players;
		uint time_limit;
		mapping(uint => mapping(uint => uint)) board;
	}

	//	CONSTRUCTOR

	/*
	Only Payee can start a game and must put in a positive amount of money
	in the pot
	*/
	function TicTacPonzi() gameActive(false) hasValue private {
		clear(msg.sender);
	}

	//	LOGISTICS-RELATED FUNCTIONS

	/*
	The Payee pays into the pot and begins the game.
	*/
	function start() payable gameActive(false) public {
		if ((msg.sender == current_game.payee) && 
			(current_game.num_players == 0)) {
			balances[msg.sender] = msg.value;
			current_game.num_players = 1;
		}
	}

	/*
	Only the Challenger can challenge a Payee and must pay in x1.1 whatever
	the Payee put in the pot.
	*/
	function challenge() payable gameActive(false) hasValue private {
		if ((msg.sender != payee) && (current_game.challenger == 0) && 
			(current_game.players == 1)) {
			current_game.active = true;
			current_game.challenger = msg.sender;
			current_game.pot += msg.value;
			current_game.turn = 1;
			current_game.num_players = 2;
			current_game.time_limit = now;

			gameStart(current_game.payee, current_game.challenger);
		}
	}

    /*
    Converts player addresses into game tokens.
    Returns 0 if there is an error.
    */
	function getPlayerToken(address player) returns (uint) private {
		if (player == current_game.payee) {
			return 1;
		}
		if (player == current_game.challenger) {
			return -1;
		}
		return 0;
	}

	/*
    Converts game tokens into player addresses.
    Returns 0 if there is an error.
    */
    function getPlayerAddress(uint token) returns (address) private {
        if (token == 1) {
            return current_game.payee;
        }
        if (token == -1) {
            return current_game.challenger;
        }
        return 0;
    }

    /*
    Check if a move is valid and whether that move wins the game.
    Returns a Boolean value.
    */
    function checkValidMove(uint token, uint row, uint column)
        gameActive(true) returns (bool) private {
        if ((row < 0) || (row > 2) || (column < 0) || (column > 2)) {
            return false;
        }
        if (board[row][column] != 0) {
            return false;
        }
        return true;
    }

    /*
    Check if a move results in the victory of current player.
    Returns TRUE if there is a win, FALSE if there is not.
    */
    function checkWin(uint player_token) gameActive(true) returns (bool) private {
        //Checks for the row sums
        if ((board[0][0] + board[0][1] + board[0][2] == 3 * player_token) ||
            (board[1][0] + board[1][1] + board[1][2] == 3 * player_token) ||
            (board[0][0] + board[1][0] + board[2][0] == 3 * player_token)) {
            return true;
        }
        //Checks for the column sums
        else if ((board[0][0] + board[1][0] + board[2][0] == 3 * player_token) ||
            (board[0][1] + board[1][1] + board[2][1] == 3 * player_token) ||
            (board[0][2] + board[1][2] + board[2][2] == 3 * player_token)) {
            return true;
        }
        //Checks diagonal sums
        else if ((board[0][0] + board[1][1] + board[2][2] == 3 * player_token) ||
            (board[0][2] + board[1][1] + board[2][0] == 3 * player_token)) {
            return true;
        }
        return false;

    /*
    Called when a player runs out of time.
    Called by: play().
    */
    //What if you never make the play?
      //an outside person cou
     function checkTimeOut() gameActive(true) public {
      if (now - current_game.time_limit > 3600) {
      	winner(getPlayerAddress(-1*current_game.turn));
      }
      updateTimeLimit();
    }

    /*
    Update the time limit every time a function is called.
    */
    function updateTimeLimit() private {
    	current_game.time_limit = now;
    }

	//	GAME OVER

	/*
	Is called when a winner is decided. Handles balances and resets the board.
	Called by: timeOut(), play().
	*/
    function winner(address victor) private {
    	if (victor == current_game.payee) {
    		_payee_profit = current_game.pot;
    	}
     	if (victor == current_game.challenger) {
    		_payee_profit = 0;
    	}

		gameEnd(victor, _payee_profit)
	}

	/*
	Used by players to withdraw their money from their account.
	*/
    function withdraw() gameActive(false) returns (bool) public {
      uint amount = balances[msg.sender];
      if (amount > 0) {
        balances[msg.sender] = 0;
        if (!msg.sender.send(amount)) {
          balances[msg.sender] = amount;
          return false;
        }
      }
      return true;
    }

	//	BOARD-RELATED FUNCTIONS

	/*
	Wipe board and start anew.
	Called by: TicTacPonzi().
	*/
	function newBoard(address host) private {
        current_game.active = false;
        current_game.payee = host;
        current_game.challenger = 0;
        current_game.pot = 0;
        current_game.turn = 0;
        current_game.num_players = 0;
        current_game.time_limit = 3600;

        for(uint r; r < 3; r++)
            for(uint c; c < 3; c++)
                g.board[r][c] = 0;
    }

	/*
    Allows current players to inset their tokens onto the board.
    Payee tokens are represented as '1' and Challenger tokens as 
    '-1'.
    */
    function play(uint row, uint column) gameActive(true) public {
      checkTimeOut();
      p = getPlayerToken(msg.sender);
      if ((p == 1) && (p == current_game.turn) &&
          checkValidMove(1, row, column)) {
          board[row][column] = 1;
          if (checkWin) {
              winner(current_game.payee);
          }
          current_game.turn = -1;
      }
      if ((p == -1) && (p == current_game.turn) && 
          checkValidMove(-1, row, column)) {
          board[row][column] = -1;
          if (checkWin) {
              winner(current_game.challenger);
          }
          current_game.turn = 1;
      }
    }

	/*
    Allow anyone to check on the state of the game and the moves everyone
    has made so far.
    */
	function getState(address host) gameActive(true) returns (uint _pot, uint _turn,
		address _payee, address _challenger, uint _time_limit, uint row1,
		uint row2, uint row3) public {
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
