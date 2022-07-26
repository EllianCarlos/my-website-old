---
layout: post
title: How to pick players in Cartola, an approach based on the knapsack problem
cover-img: /assets/img/soccer.jpg
thumbnail-img: /assets/img/soccer.jpg
share-img: /assets/img/soccer.jpg
tags: [cartola, fantasy, problema-da-mochila, python, gurobi]
---
The Football fantasy game [Cartola](https://cartolafc.globo.com) is a online game where each round of the brasilian competition where you can pick a team of real athletes and pontuate based on the perfomance of the chosen athletes. The game also has online rankings and competitions.  

![A cartola team](/assets/img/cartola.png "A Cartola team")

Each athlete cost cartoletas, the virtual coin of the game, the game objective is to maximize the number of points of your team, given an your amount of cartoletas.
- Which will be the pontuation of a athlete in the next round?
- Within my cartoletas, what players do I choose?


The first problem is prediction problem, find the next pontuation of an athlete is not trivial and I shall not work this part of the problem here, maybe in a next opportunity. Right now, I will estimate the next pontuation with simply the average of the previous pontuations.

The second problem is the [knapsack problem](https://en.wikipedia.org/wiki/Knapsack_problem),  each player has a cost and some metric that we want to maximize, in this case the average pontuation. We want to find the maximum pontuation we can find given our number of cartoletas. To solve this problem we will use Python and [Gurobi](https://www.gurobi.com), a tool for mathmatical optimization.

The first part of our code is to get the data from Cartola API. This is simples, so I'll let the code here:

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

This file is called `utils.py`. It's posible to add other available data of Cartola API in our dataframe, but I'll use just these ones. I added these lines to simplify some functionalities:

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

So, we start the model:

```python
m = gp.Model("Mochila")
```

And add the variables gurobi will use to know which player should or should not be added in the knapsack.

```python
x = m.addVars(N, vtype=GRB.BINARY)
```


The `GRB.BINARY` tells that a player can't be added in parts, this is, our knapsack is a binary integer problem, the player is or isn't present in the knapsack. There is no such thing as adding half a player or even adding 1 player, there is just the presence or abstinence of player in the knapsack.

Now we add the function which define what is to maximize within our model, in our case, the player average perfomance:


```python
m.setObjective(sum(medias[i]*x[i] for i in range(N)), GRB.MAXIMIZE)
```

Após adicionar a função a ser maximizada, temos que colocar as restrições do modelo, o cartola possibilita que apenas 12 atletas façam parte de seu plantel, sendo um deles o técnico e um o goleiro, os outros jogadores vão depender da formação escolhida. Aqui eu decidi pela formação $$4$$-$$3$$-$$3$$, com $$2$$ zagueiros, $$2$$ laterais, $$3$$ meias e $$3$$ atacantes.

After adding a function to be maximized, we must add the restrictions of our model. This is a important part of the modelling proccess and in this case is a caveat of cartola fantasy. So things like, the team formation (4-3-3), the number of players, the total cost, the position of each player, etc, will be taken into the model here.

```python
m.addConstr(sum(jogos[i]*x[i] for i in range(N)) >= 7) # Each player should have played at least 7 games
m.addConstr(sum(cost[i]*x[i] for i in range(N)) <= cartoletas) # The cost of the team must be smaller or equal than our number of cartoletas
m.addConstr(sum(1*x[i] for i in range(N)) <= 12) # There must be 12 players (11 players + 1 coach)
m.addConstr(sum((posicoes[i] == 1)*1*x[i] for i in range(N)) == 1) # Just 1 Goalkeeper
m.addConstr(sum((posicoes[i] == 2)*1*x[i] for i in range(N)) == 2) # Just 2 Full-backs
m.addConstr(sum((posicoes[i] == 3)*1*x[i] for i in range(N)) == 2) # Just 2 Center-backs
m.addConstr(sum((posicoes[i] == 4)*1*x[i] for i in range(N)) == 3) # Just 3 Midfielders
m.addConstr(sum((posicoes[i] == 5)*1*x[i] for i in range(N)) == 3) # Just 3 Fowards
m.addConstr(sum((posicoes[i] == 6)*1*x[i] for i in range(N)) == 1) # Just 1 Coach
m.addConstr(sum((status[i] == 7)*1*x[i] for i in range(N)) == 12) # Just players with the "available" status
```

The restriction of just "available" athletes could be done directly in the dataframe via an filter, but I wanna show the capabilities of gurobi modelling. Now, let the optimizer do its job:

```python
m.optimize()
```

Just see which players the model chose:

```python
print("\nOptimal Solution Value:\t"+str(m.objVal))
print("Weight:\t"+str(sum(cost[i]*x[i].X for i in range(N))))
for i in range(N):
    if (x[i].X != 0):
        print("Item "+str(i+1)+": "+str(x[i].X) + " - Name: " + df.iloc[i]['slug'])

```

Well, if you've ever played cartola and did the tests, you know the chosen model is not good. It's an insensible solution, this is only because of our metric, just the players average is not a good way of estimating performance. To improve this model we would need to come up with a different estimative.