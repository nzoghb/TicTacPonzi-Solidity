//	TicTacPonzi Contract for Blockchain@Berkeley.
//	Copyright (c) 2017 Nicolas Zoghb (IoT Agriculture Team).
//  Released under the MIT License.
//	Version 1.2.0, 23 February 2017 (Started: 15 February 2017).

pragma solidity ^0.4.0;

contract TicTacPonzi {

	//	PREAMBLE

	mapping (address => uint) public balances;
	Game private current_game;

	/*
	Make sure certain conditions are met before executing functions.
	Used in: TicTacPonzi(), challenge().
	*/
	modifier hasValue { if (msg.value > 0) _; }
	modifier gameActive (bool _active) 
		{ if (current_game.active == _active) _; }
	modifier numPlayers (int num)
		{ if (current_game.num_players == num) _; }

	/*
	Data structure representing the game. Contains all temporary variables.
	*/
	struct Game {
		bool active;
		address payee;
		address challenger;
		uint old_pot;
		uint pot;
		int turn;
		int num_players;
		uint time_limit;
		mapping(uint => mapping(uint => int)) board;
	}

	//	CONSTRUCTOR

	/*
	Only Payee can start a game and must put in a positive amount of money
	in the pot
	*/
	function TicTacPonzi() {
		newBoard(msg.sender);
		current_game.pot = 0;
	}

	//	LOGISTICS-RELATED FUNCTIONS

	/*
	The Payee pays into the pot and begins the game. This can happen if the
	contract has just been deployed OR if there is no current Payee (last
	Payee forfeited).
	*/
	function start() payable gameActive(false) numPlayers(0) hasValue public {
		if (msg.value >= current_game.pot) {
			if (msg.sender == current_game.payee) {
				balances[msg.sender] = msg.value;
				current_game.num_players = 1;
				current_game.pot = msg.value;
				current_game.old_pot = current_game.pot;
			}
			else if (current_game.payee == 0) {
				current_game.payee = msg.sender;
				current_game.pot = msg.value;
				current_game.old_pot = current_game.pot;
			}
		}
	}

	/*
	Only the Challenger can challenge a Payee and must pay in x1.1 whatever
	the Payee put in the pot.
	*/
	function challenge() payable numPlayers(1) hasValue public {
		balances[msg.sender] = msg.value;
		if ((msg.sender != current_game.payee) &&
			(current_game.challenger == 0) &&
			(msg.value >= (11*current_game.old_pot)/10)) {
			current_game.challenger = msg.sender;
			current_game.num_players = 2;
			current_game.active = true;
			current_game.old_pot = current_game.pot;
			current_game.pot = msg.value;
			current_game.turn = 1;
			current_game.time_limit = now;
		}
	}

	/*
	Converts player addresses into game tokens.
	Returns 0 if there is an error.
	*/
	function getPlayerToken(address player) private returns (int) {
		if (player == current_game.payee) {
			return 1;
		}
		else if (player == current_game.challenger) {
			return -1;
		}
		return 0;
	}

	/*
	Converts game tokens into player addresses.
	Returns 0 if there is an error.
	*/
	function getPlayerAddress(int token) private returns (address) {
		if (token == 1) {
			return current_game.payee;
		}
		else if (token == -1) {
			return current_game.challenger;
		}
		return 0;
	}

	/*
	Check if a move is valid and whether that move wins the game.
	Returns a Boolean value.
	Called by: play().
	*/
	function checkValidMove(int token, uint row, uint column)
		gameActive(true) private returns (bool) {
		if ((row < 0) || (row > 2) || (column < 0) || (column > 2)) {
			return false;
		}
		if (current_game.board[row][column] != 0) {
			return false;
		}
		return true;
	}

	/*
	Check if a move results in the victory of current player.
	Returns TRUE if there is a win, FALSE if there is not.
	Called by: play().
	*/
	function checkWin(int player_token) gameActive(true) private returns (bool) {
		//	Checks for the row sums
		if ((current_game.board[0][0] + current_game.board[0][1] +
			current_game.board[0][2] == 3 * player_token) ||
			(current_game.board[1][0] + current_game.board[1][1] +
				current_game.board[1][2] == 3 * player_token) ||
			(current_game.board[2][0] + current_game.board[2][1] +
				current_game.board[2][2] == 3 * player_token)) {
			return true;
		}
		//	Checks for the column sums
		else if ((current_game.board[0][0] + current_game.board[1][0] +
			current_game.board[2][0] == 3 * player_token) ||
			(current_game.board[0][1] + current_game.board[1][1] +
				current_game.board[2][1] == 3 * player_token) ||
			(current_game.board[0][2] + current_game.board[1][2] +
				current_game.board[2][2] == 3 * player_token)) {
			return true;
		}
		//	Checks diagonal sums
		else if ((current_game.board[0][0] + current_game.board[1][1] +
			current_game.board[2][2] == 3 * player_token) ||
			(current_game.board[0][2] + current_game.board[1][1] +
				current_game.board[2][0] == 3 * player_token)) {
			return true;
		}
		return false;
	}

	/*
	Checks the board for a draw.
	Called by: play().
	*/
	function checkDraw() gameActive(true) private returns (bool) {
		for(uint row; row < 3; row++) {
			for(uint column; column < 3; column++) {
				if (current_game.board[row][column] == 0) {
					return false;
				}
			}
		}
		return true;
	}

	/*
	Checks when a player runs out of time.
	Called by: play().
	*/
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
	Called by: timeOut(), forfeit(), play().
	*/
	function winner(address victor) private {
		uint _pot = balances[current_game.payee] +
				balances[current_game.challenger];
		if (victor == current_game.payee) {
			balances[current_game.payee] = _pot;
			balances[current_game.challenger] = 0;
		}
		else if (victor == current_game.challenger) {
			balances[current_game.payee] = current_game.old_pot;
			balances[current_game.challenger] = _pot - current_game.old_pot;
		}
		newBoard(current_game.challenger);
		current_game.num_players = 1;
	}

	/*
	Player forfeits to their opponent.
	*/
	function forfeit() gameActive(true) public {
		if (msg.sender == current_game.payee || 
			msg.sender == current_game.challenger) {
			if (current_game.num_players == 1) {
				newBoard(0);
				current_game.active = false;
			}
			else if (current_game.num_players == 2) {
				winner(getPlayerAddress(-1*getPlayerToken(msg.sender)));
			}
		}
	}

	/*
	Used by players to withdraw their money from their account.
	*/
	function withdraw() public returns (bool) {
		if ((msg.sender == current_game.payee) ||
			(msg.sender == current_game.challenger)) {
				return false;
		}
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
	Called by: TicTacPonzi(), join(), winner(), forfeit().
	*/
	function newBoard(address host) private {
		current_game.active = true;
		current_game.payee = host;
		current_game.challenger = 0;
		current_game.turn = 0;
		current_game.num_players = 0;
		current_game.time_limit = 0;
	}

	/*
	Allows current players to inset their tokens onto the board.
	Payee tokens are represented as '1' and Challenger tokens as 
	'-1'.
	*/
	function play(uint row, uint column) gameActive(true) public {
		checkTimeOut();
		int p = getPlayerToken(msg.sender);

		if ((p == current_game.turn) && 
			checkValidMove(p, row, column)) {
			current_game.board[row][column] = p;
			if (checkWin(p)) {
				winner(getPlayerAddress(p));
			}
			else if (checkDraw()) {
				winner(current_game.payee);
			}
			current_game.turn = -1 * p;
		}
	}

	/*
	Allow anyone to check on the state of the game and the moves everyone
	has made so far.
	*/
	function getState(address host) gameActive(true) constant public returns
		(uint _pot, int _turn, address _payee, address _challenger,
			uint _time_limit, int[3] row1, int[3] row2, int[3] row3) {
		_pot = current_game.pot;
		_challenger = current_game.challenger;
		_time_limit = current_game.time_limit;
		_turn = current_game.turn;
		row1 = [current_game.board[0][0], current_game.board[0][1],
		current_game.board[0][2]];
		row2 = [current_game.board[1][0], current_game.board[1][1],
		current_game.board[1][2]];
		row3 = [current_game.board[2][0], current_game.board[2][1],
		current_game.board[2][2]];
	}
}
