"""
Ponto de entrada unificado para facilitar o comando 'python -m src.cli'.
Este arquivo apenas delega a execução para src/interfaces/cli.py.
"""

from src.interfaces.cli import main

if __name__ == "__main__":
    main()
