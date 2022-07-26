---
layout: post
title: { 'Escalar atletas no Cartola, uma abordagem através do problema da mochila' }
cover-img: /assets/img/soccer.jpg
thumbnail-img: /assets/img/soccer.jpg
share-img: /assets/img/soccer.jpg
tags: [cartola, fantasy, problema-da-mochila, python, gurobi]
---

O Jogo [Cartola](https://cartolafc.globo.com) de fantasia de futebol é um jogo online onde a cada rodada do campeonato brasileiro de futebol um jogador pode escalar um time de atletas reais e dependendo da performance deles em seus reais jogos, eles pontuam no jogo online. O jogo conta com uma série de competições e rankings, assim incentivando a você querer fazer sem o máximo de pontos.

![Print de um time do Cartola](/assets/img/cartola.png "Print de um Time do Cartola")

Cada jogador tem um custo na moeda do jogo, as cartoletas, e o objetivo do jogo é maximizar o número de pontos que seu time irá fazer em uma rodada dentro do total de cartoletas que você possui, começando com $$100$$ na primeira rodada. Assim existem dois problemas principais para serem analisados:

- Qual será a pontuação de X jogador na próxima rodada?
- Dentro das minhas cartoletas, quais atletas eu escolho?

O primeiro problema é um problema de predição, achar a pontuação do que um jogador irá fazer na próxima rodada não é trivial e deixaremos para tratar isso em, talvez, uma oportunidade futura. Por enquanto, usaremos um estimador muito simples para prever a nota de um jogador, usaremos a média como estimador.

O segundo é o [problema da mochila](https://pt.wikipedia.org/wiki/Problema_da_mochila), cada jogador possui um custo e dado algo que queremos maximizar, nesse caso a média, queremos achar a pontuação máxima que conseguimos obter dentro das nossas cartoletas. Para resolver esse segundo problema utilizaremos o python com o uso do [Gurobi](https://www.gurobi.com), uma ferramenta de optmização matemática.

A primeira parte é pegar os dados da API do Cartola, que em si é simples então deixarei o código aqui:

```python
import pandas as pd
import requests as req
import json

def get_df_players():
    base_url = 'https://api.cartolafc.globo.com'
    mercado_path = '/atletas/mercado'
    res = req.get(base_url + mercado_path)

    df = pd.json_normalize(res.json()["atletas"])
    df = df[['atleta_id', 'slug', 'posicao_id', 'status_id', 'preco_num', 'media_num', 'jogos_num']]
    return df

```

Esse arquivo eu chamei de `utils.py`. É possível também adicionar outros dados que o cartola disponibiliza para adicionar no dataframe, eu utilizei apenas estes, porém o nome do jogador entre outras coisas pode ser interessante para uso.
Para utilizar o gurobi mais facilmente com o pandas eu separei algumas coisas:

```python
from utils import get_df_players
import gurobipy as gp
from gurobipy import GRB

df = get_df_players()

N = len(df)

cost = df['preco_num']
cartoletas = 125
medias = df['media_num']
jogos = df['jogos_num']
posicoes = df['posicao_id']
status = df['status_id']

```

Iniciamos o modelo do gurobi:

```python
m = gp.Model("Mochila")
```

E agora adicionamos a variável que o gurobi irá utilizar para saber qual jogador deve ou não ser adicionado a mochila.

```python
x = m.addVars(N, vtype=GRB.BINARY)
```

O `GRB.BINARY` indica que um jogador pode ou não ser adicionado, isso é bem definido pelo cartola, porque não há forma de se adicionar "meio" jogador.
Agora devemos dizer para o modelo qual a função que queremos maximizar, como já dito, iremos maximizar a média dos atletas.

```python
m.setObjective(sum(medias[i]*x[i] for i in range(N)), GRB.MAXIMIZE)
```

Após adicionar a função a ser maximizada, temos que colocar as restrições do modelo, o cartola possibilita que apenas 12 atletas façam parte de seu plantel, sendo um deles o técnico e um o goleiro, os outros atletas vão depender da formação escolhida. Aqui eu decidi pela formação $$4$$-$$3$$-$$3$$, com $$2$$ zagueiros, $$2$$ laterais, $$3$$ meias e $$3$$ atacantes.

```python
m.addConstr(sum(jogos[i]*x[i] for i in range(N)) >= 7) # Deve ter jogado mais de 7 jogos
m.addConstr(sum(cost[i]*x[i] for i in range(N)) <= cartoletas) # Custo não pode ser maior que o número de cartoletas
m.addConstr(sum(1*x[i] for i in range(N)) <= 12) # Apenas 12 atletas
m.addConstr(sum((posicoes[i] == 1)*1*x[i] for i in range(N)) == 1) # Apenas 1 Goleiro
m.addConstr(sum((posicoes[i] == 2)*1*x[i] for i in range(N)) == 2) # Apenas 2 Laterais
m.addConstr(sum((posicoes[i] == 3)*1*x[i] for i in range(N)) == 2) # Apenas 2 Zagueiros
m.addConstr(sum((posicoes[i] == 4)*1*x[i] for i in range(N)) == 3) # Apenar 3 Meias
m.addConstr(sum((posicoes[i] == 5)*1*x[i] for i in range(N)) == 3) # Apenas 3 Atacantes
m.addConstr(sum((posicoes[i] == 6)*1*x[i] for i in range(N)) == 1) # Apenas 1 Tecnico
m.addConstr(sum((status[i] == 7)*1*x[i] for i in range(N)) == 12) # Apenas atletas prováveis
```

A restrição de apenas atletas prováveis poderia ser feita direto no dataframe, porém eu queria mostrar que também é possível de ser feita aqui. Agora basta otimizar o modelo!

```python
m.optimize()
```

Se quiser ver quais atletas o optmizador escolheu:

```python
print("\nValor da solução ótima:\t"+str(m.objVal))
print("Carga ocupada:\t"+str(sum(cost[i]*x[i].X for i in range(N))))
for i in range(N):
    if (x[i].X != 0):
        print("Item "+str(i+1)+": "+str(x[i].X) + " - Nome: " + df.iloc[i]['slug'])

```

Bem, se você joga cartola e fez os testes acima sabe que o time que o modelo escolheu, não pontua bem, hoje, na vigésima rodada do brasileirão esse modelo está pontuando pior que a média dos cartoleiros, isso se deve ao fato do estimador média, ser um estimador ruim para nosso problema, um estimador melhor, resultaria em um melhor resultado!