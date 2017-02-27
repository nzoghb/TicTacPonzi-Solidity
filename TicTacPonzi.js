//	TicTacPonzi Contract for Blockchain@Berkeley.
//	Copyright (c) 2017 Nicolas Zoghb (IoT Agriculture Team).
//  Released under the MIT License.
//	Version 1.3.0, 26 February 2017 (Started: 15 February 2017).

pragma solidity ^0.4.0;

contract TicTacPonzi {

	//	PREAMBLE

	mapping (address => uint) public balances;
	Game private current_game;
	address private payee;
	address private challenger;
	uint private payee_payment;
	uint private challenger_payment;

	/*
	Make sure certain conditions are met before executing functions.
	Used in: TicTacPonzi(), start(), challenge().
	*/
	modifier hasValue {
		if (msg.value <= 0) {
			throw;
		}
		_;
	}

	modifier numPlayers (int num) {
		if (current_game.num_players != num) {
			throw;
		}
		_;
	}

	/*
	Data structure representing the game. Contains all temporary variables.
	*/
	struct Game {
		bool active;
		int turn;
		int num_players;
		uint last_time;
		mapping(uint => mapping(uint => int)) board;
		uint turns_played;
	}

	//	CONSTRUCTOR

	/*
	Only Payee can start a game and must put in a positive amount of money in
	the pot.
	*/
	function TicTacPonzi() {
		newBoard(msg.sender);
	}

	//	LOGISTICS-RELATED FUNCTIONS

	/*
	The Payee pays into the pot and begins the game. This can happen if the
	contract has just been deployed OR if there is no current Payee (last
	Payee forfeited).
	*/
	function start() payable numPlayers(0) hasValue public {
		balances[msg.sender] += msg.value;
		if (msg.value >= payee_payment) {
			if (msg.sender == payee) {
				payee_payment = msg.value;
				current_game.num_players = 1;
			}
			else if (payee == 0) {
				payee = msg.sender;
				payee_payment = msg.value;
				current_game.num_players = 1;
			}
		}
	}

	/*
	Only the Challenger can challenge a Payee and must pay in x1.1 whatever
	the Payee put in the pot.
	*/
	function challenge() payable numPlayers(1) hasValue public {
		if (msg.sender == payee) {
			throw;
		}
		balances[msg.sender] += msg.value;
		if (challenger == 0 && msg.value >= uint(11*int(payee_payment)/10)) {
			challenger = msg.sender;
			current_game.num_players = 2;
			challenger_payment = msg.value;
			current_game.turn = 1;
			current_game.last_time = now;
		}
	}

	/*
	Converts player addresses into game tokens.
	Returns 0 if there is an error.
	*/
	function getPlayerToken(address player) private returns (int) {
		if (player == payee) {
			return 1;
		}
		else if (player == challenger) {
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
			return payee;
		}
		else if (token == -1) {
			return challenger;
		}
		return 0;
	}

	/*
	Check if a move is valid and whether that move wins the game.
	Returns a Boolean value.
	Called by: play().
	*/
	function checkValidMove(uint row, uint column) private returns (bool) {
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
	Loops are rows, columns, diagonals in that order.
	Called by: play().
	*/
	function checkWin(int player_token) private returns (bool) {
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
	function checkGameEnd() private returns (bool) {
		if (current_game.turns_played == 9) {
			return true;
		}
		return false;
	}

	/*
	Checks when a player runs out of time.
	Called by: play().
	*/
	function checkTimeOut() numPlayers(2) public returns (bool) {
		if (now - current_game.last_time > 3600) {
			winner(getPlayerAddress(-1*current_game.turn));
			return true;
		}
		return false;
	}

	//	GAME OVER

	/*
	Is called when a winner is decided. Handles balances and resets the board.
	Called by: timeOut(), forfeit(), play().
	*/
	function winner(address victor) private {
		if (victor == payee) {
			balances[challenger] -= challenger_payment;
			balances[payee] += challenger_payment;
		}
		else if (victor == challenger) {
			balances[challenger] -= payee_payment;
			balances[payee] += payee_payment;
		}
		newBoard(challenger);
		payee_payment = challenger_payment;
		challenger_payment = 0;
		current_game.num_players = 1;
	}

	/*
	Player forfeits to their opponent.
	*/
	function forfeit() public {
		if (msg.sender == payee || 
			msg.sender == challenger) {
			if (current_game.num_players == 1) {
				newBoard(0);
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
		if ((msg.sender == payee) ||
			(msg.sender == challenger)) {
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
	Called by: TicTacPonzi(), winner(), forfeit().
	*/
	function newBoard(address host) private {
		payee = host;
		challenger = 0;
		delete(current_game);

		current_game.board[0][0] = 0;
		current_game.board[0][1] = 0;
		current_game.board[0][2] = 0;
		current_game.board[1][0] = 0;
		current_game.board[1][1] = 0;
		current_game.board[1][2] = 0;
		current_game.board[2][0] = 0;
		current_game.board[2][1] = 0;
		current_game.board[2][2] = 0;
	}

	/*
	Allow current players to insert their tokens onto the board.
	Payee tokens are represented as '1' and Challenger tokens as 
	'-1'.
	*/
	function play(uint row, uint column) numPlayers(2) public {
		if (checkTimeOut()) {
			return;
		}
		int p = getPlayerToken(msg.sender);
		if ((p == current_game.turn) && 
			checkValidMove(row, column)) {
			current_game.board[row][column] = p;
			current_game.last_time = now;
			current_game.turns_played += 1;
			if (checkWin(p)) {
				winner(getPlayerAddress(p));
				return;
			}
			else if (checkGameEnd()) {
				winner(payee);
				return;
			}
			current_game.turn = -1 * p;
		}
	}

	/*
	Allow anyone to check their funds.
	*/
	function getBalance(address host) constant public returns (uint) {
		return balances[host];
	}

	/*
	Allow anyone to check how much time is left before the turn ends.
	*/
	function getTimeLeft() numPlayers(2) constant public returns (uint) {
		uint diff = now - current_game.last_time;
		if (diff >= 3600) {
			return 0;
		}
		return 3600 - diff;
	}

	/*
	Allow anyone to check on the state of the game and the moves everyone
	has made so far.
	*/
	function getState() constant public returns
		(address _payee, uint _payee_payment, address _challenger,
			uint _challenger_payment,int _turn, uint _last_time,
			int _num_players, int[3] row1, int[3] row2, int[3] row3) {
		_payee = payee;
		_payee_payment = payee_payment;
		_challenger = challenger;
		_challenger_payment = challenger_payment;
		_turn = current_game.turn;
		_last_time = current_game.last_time;
		_num_players = current_game.num_players;
		row1 = [current_game.board[0][0], current_game.board[0][1],
		current_game.board[0][2]];
		row2 = [current_game.board[1][0], current_game.board[1][1],
		current_game.board[1][2]];
		row3 = [current_game.board[2][0], current_game.board[2][1],
		current_game.board[2][2]];
	}
}
