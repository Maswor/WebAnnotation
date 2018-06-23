<?php declare(strict_types = 1);

namespace PHPStan\PhpDocParser\Parser;

use PHPStan\PhpDocParser\Lexer\Lexer;

class TokenIterator
{

	/** @var mixed[][] */
	private $tokens;

	/** @var int */
	private $index;

	/** @var int[] */
	private $savePoints = [];

	public function __construct(array $tokens, int $index = 0)
	{
		$this->tokens = $tokens;
		$this->index = $index;

		if ($this->tokens[$this->index][Lexer::TYPE_OFFSET] === Lexer::TOKEN_HORIZONTAL_WS) {
			$this->index++;
		}
	}


	public function currentTokenValue(): string
	{
		return $this->tokens[$this->index][Lexer::VALUE_OFFSET];
	}


	public function currentTokenType(): int
	{
		return $this->tokens[$this->index][Lexer::TYPE_OFFSET];
	}


	public function currentTokenOffset(): int
	{
		$offset = 0;
		for ($i = 0; $i < $this->index; $i++) {
			$offset += strlen($this->tokens[$i][Lexer::VALUE_OFFSET]);
		}

		return $offset;
	}


	public function isCurrentTokenValue(string $tokenValue): bool
	{
		return $this->tokens[$this->index][Lexer::VALUE_OFFSET] === $tokenValue;
	}


	public function isCurrentTokenType(int $tokenType): bool
	{
		return $this->tokens[$this->index][Lexer::TYPE_OFFSET] === $tokenType;
	}


	/**
	 * @param  int $tokenType
	 * @throws \PHPStan\PhpDocParser\Parser\ParserException
	 */
	public function consumeTokenType(int $tokenType)
	{
		if ($this->tokens[$this->index][Lexer::TYPE_OFFSET] !== $tokenType) {
			$this->throwError($tokenType);
		}

		$this->index++;

		if (($this->tokens[$this->index][Lexer::TYPE_OFFSET] ?? -1) === Lexer::TOKEN_HORIZONTAL_WS) {
			$this->index++;
		}
	}


	public function tryConsumeTokenValue(string $tokenValue): bool
	{
		if ($this->tokens[$this->index][Lexer::VALUE_OFFSET] !== $tokenValue) {
			return false;
		}

		$this->index++;

		if ($this->tokens[$this->index][Lexer::TYPE_OFFSET] === Lexer::TOKEN_HORIZONTAL_WS) {
			$this->index++;
		}

		return true;
	}


	public function tryConsumeTokenType(int $tokenType): bool
	{
		if ($this->tokens[$this->index][Lexer::TYPE_OFFSET] !== $tokenType) {
			return false;
		}

		$this->index++;

		if ($this->tokens[$this->index][Lexer::TYPE_OFFSET] === Lexer::TOKEN_HORIZONTAL_WS) {
			$this->index++;
		}

		return true;
	}


	public function getSkippedHorizontalWhiteSpaceIfAny(): string
	{
		if ($this->tokens[$this->index - 1][Lexer::TYPE_OFFSET] === Lexer::TOKEN_HORIZONTAL_WS) {
			return $this->tokens[$this->index - 1][Lexer::VALUE_OFFSET];
		}

		return '';
	}


	public function joinUntil(int ...$tokenType): string
	{
		$s = '';
		while (!in_array($this->tokens[$this->index][Lexer::TYPE_OFFSET], $tokenType, true)) {
			$s .= $this->tokens[$this->index++][Lexer::VALUE_OFFSET];
		}
		return $s;
	}


	public function next()
	{
		$this->index++;

		if ($this->tokens[$this->index][Lexer::TYPE_OFFSET] === Lexer::TOKEN_HORIZONTAL_WS) {
			$this->index++;
		}
	}


	public function pushSavePoint()
	{
		$this->savePoints[] = $this->index;
	}


	public function dropSavePoint()
	{
		array_pop($this->savePoints);
	}


	public function rollback()
	{
		$this->index = array_pop($this->savePoints);
	}


	/**
	 * @param  int $expectedTokenType
	 * @throws \PHPStan\PhpDocParser\Parser\ParserException
	 */
	private function throwError(int $expectedTokenType)
	{
		throw new \PHPStan\PhpDocParser\Parser\ParserException(
			$this->currentTokenValue(),
			$this->currentTokenType(),
			$this->currentTokenOffset(),
			$expectedTokenType
		);
	}

}