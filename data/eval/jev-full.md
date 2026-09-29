# Jev — full-bank eval (272 questions)

- **Model:** `typesafe/jev-1.13` via OpenRouter decisions endpoint
- **Date:** 2026-09-29
- **Bank:** all 272 published questions from `content/questions/*.json`
- **Method:** **one decisions call per question** (each decision sees only its own question), fired through a pool of 32 concurrent requests — 4.5s wall time for 272 calls
- **Cost:** $0.00475
- **Scoring:** `strict` = highest-probability option correct. `recovered` = strict miss, confidence < 0.5 (Jev unsure), correct option ranked 2nd with p ≥ 0.35. `lenient` = strict + recovered.
- **Caveat:** the questions are public in this repo, so this measures recall of published items as much as knowledge.

## By tier

| group | n | strict | recovered | lenient | mean conf |
| --- | --- | --- | --- | --- | --- |
| easy (difficulty 1) | 90 | 86 (96%) | 1 | 97% | 0.94 |
| medium (2) | 118 | 114 (97%) | 0 | 97% | 0.93 |
| difficult (3–4) | 64 | 60 (94%) | 1 | 95% | 0.90 |
| **overall** | 272 | 260 (96%) | 2 | 96% | 0.92 |

## By difficulty

| group | n | strict | recovered | lenient | mean conf |
| --- | --- | --- | --- | --- | --- |
| difficulty 1 | 90 | 86 (96%) | 1 | 97% | 0.94 |
| difficulty 2 | 118 | 114 (97%) | 0 | 97% | 0.93 |
| difficulty 3 | 57 | 54 (95%) | 0 | 95% | 0.90 |
| difficulty 4 | 7 | 6 (86%) | 1 | 100% | 0.90 |

## By category

| group | n | strict | recovered | lenient | mean conf |
| --- | --- | --- | --- | --- | --- |
| benchmarks | 14 | 14 (100%) | 0 | 100% | 0.99 |
| business | 14 | 12 (86%) | 0 | 86% | 0.80 |
| concepts | 22 | 22 (100%) | 0 | 100% | 1.00 |
| ethics | 20 | 19 (95%) | 0 | 95% | 0.94 |
| hardware | 16 | 16 (100%) | 0 | 100% | 0.95 |
| history | 10 | 10 (100%) | 0 | 100% | 1.00 |
| labs | 15 | 13 (87%) | 0 | 87% | 0.84 |
| memes | 26 | 23 (88%) | 2 | 96% | 0.81 |
| models | 59 | 58 (98%) | 0 | 98% | 0.97 |
| open-source | 10 | 10 (100%) | 0 | 100% | 0.94 |
| papers | 8 | 8 (100%) | 0 | 100% | 0.95 |
| people | 28 | 26 (93%) | 0 | 93% | 0.89 |
| products | 12 | 11 (92%) | 0 | 92% | 0.85 |
| technology | 18 | 18 (100%) | 0 | 100% | 0.95 |

## Recovered (2)

| id | q | correct | Jev pick (p) | 2nd (p) | conf |
| --- | --- | --- | --- | --- | --- |
| `mem-0008` | Among Us, released in 2018, became a meme for a specific rea… | D. Its gameplay was used in a pop | A (0.49) | D (0.39) | 0.32 |
| `mem-0009` | Which Lovecraft creature appears in the AI meme as a giant t… | B. Shoggoth | D (0.57) | B (0.43) | 0.42 |

## Misses (10)

| id | tier | category | q | correct | Jev pick (p) | conf |
| --- | --- | --- | --- | --- | --- | --- |
| `bus-0002` | difficult | business | The AI bubble is a term for a stock market phenomenon said t… | A. 2025 | D (0.77) | 0.70 |
| `bus-0013` | medium | business | Which company announced a $6 billion Series B funding round … | B. xAI | C (0.34) | 0.14 |
| `eth-0010` | easy | ethics | Which organization published the March 2023 open letter call… | B. Future of Life Institute | D (0.96) | 0.94 |
| `lab-0008` | medium | labs | In which year did Google merge DeepMind with its Google Brai… | A. 2023 | C (0.51) | 0.35 |
| `lab-0014` | medium | labs | Which former OpenAI chief technology officer founded Thinkin… | A. Mira Murati | C (0.59) | 0.45 |
| `mem-0023` | difficult | memes | On which forum was the dead Internet theory first popularize… | C. Agora Road | A (0.33) | 0.12 |
| `mod-0018` | difficult | models | Which model first offered a 1-million-token context window i… | D. Gemini 1.5 Pro | A (0.63) | 0.51 |
| `ppl-0001` | easy | people | Which researcher has earned the title "the Godfather of AI"? | B. Geoffrey Hinton | C (0.76) | 0.67 |
| `ppl-0022` | medium | people | Who succeeded Mira Murati as OpenAI interim CEO during the N… | B. Emmett Shear | D (0.52) | 0.37 |
| `pro-0004` | easy | products | Sora, previewed by OpenAI in February 2024, became generally… | A. ChatGPT Plus and Pro subscribers | B (0.73) | 0.64 |

## All questions

| # | id | tier | category | q | correct | Jev pick (p) | conf | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `ben-0001` | medium | benchmarks | MMLU, a benchmark of multiple choice questions across many sub… | B. How much a model has learned from a… | B (1.00) | 0.99 | ✅ |
| 2 | `ben-0002` | easy | benchmarks | Chatbot Arena, now called Arena, has users do what to compare … | D. Write a prompt, get both replies, a… | D (1.00) | 1.00 | ✅ |
| 3 | `ben-0003` | medium | benchmarks | Benchmark contamination means a model has seen the test data. … | D. The reported score overstates real … | D (1.00) | 1.00 | ✅ |
| 4 | `ben-0004` | difficult | benchmarks | GPQA was built as a deliberately hard replacement for which ki… | A. PhD level science questions written… | A (0.93) | 0.91 | ✅ |
| 5 | `ben-0005` | easy | benchmarks | Which of these is a benchmark for measuring an AI system's abi… | B. SWE-bench | B (1.00) | 1.00 | ✅ |
| 6 | `ben-0006` | difficult | benchmarks | Why do benchmark scores stop being useful as the frontier moves? | D. Because public benchmarks become sa… | D (0.95) | 0.93 | ✅ |
| 7 | `ben-0007` | medium | benchmarks | What does the HumanEval benchmark test? | B. Writing short Python functions from… | B (1.00) | 1.00 | ✅ |
| 8 | `ben-0008` | medium | benchmarks | What kind of items make up the GSM8K benchmark? | A. Grade-school math word problems | A (1.00) | 1.00 | ✅ |
| 9 | `ben-0009` | easy | benchmarks | What kind of benchmark is HellaSwag? | D. A commonsense test with tricky stor… | D (1.00) | 1.00 | ✅ |
| 10 | `ben-0010` | difficult | benchmarks | What does TruthfulQA measure in a language model? | C. Tendency to repeat popular falsehoo… | C (1.00) | 1.00 | ✅ |
| 11 | `ben-0011` | difficult | benchmarks | What makes ARC-AGI different from most AI benchmarks? | A. It tests novel grid puzzles from fe… | A (1.00) | 1.00 | ✅ |
| 12 | `ben-0012` | difficult | benchmarks | What is distinctive about BIG-bench as a benchmark? | C. It pools over 200 diverse crowd-wri… | C (1.00) | 1.00 | ✅ |
| 13 | `ben-0013` | medium | benchmarks | What task does the SQuAD dataset give to a model? | C. Answering questions from Wikipedia … | C (1.00) | 1.00 | ✅ |
| 14 | `ben-0014` | easy | benchmarks | Where does the Elo rating used in Chatbot Arena come from? | D. Chess player ratings by Arpad Elo | D (1.00) | 1.00 | ✅ |
| 15 | `bus-0001` | medium | business | Before Nvidia became the company that supplies most AI trainin… | B. Graphics cards for personal compute… | B (0.99) | 0.99 | ✅ |
| 16 | `bus-0002` | difficult | business | The AI bubble is a term for a stock market phenomenon said to … | A. 2025 | D (0.77) | 0.70 | ❌ |
| 17 | `bus-0003` | difficult | business | Google acquired DeepMind in 2014. Roughly what did it pay? | A. £400 million | A (0.98) | 0.96 | ✅ |
| 18 | `bus-0004` | medium | business | Who is credited with the 1965 observation that transistor coun… | C. Gordon Moore | C (1.00) | 1.00 | ✅ |
| 19 | `bus-0005` | medium | business | Boston Dynamics, the robotics firm, has been owned since 2020 … | D. Hyundai Motor Group | D (0.97) | 0.96 | ✅ |
| 20 | `bus-0006` | easy | business | Paul Allen founded the Allen Institute for AI using money earn… | C. Microsoft | C (1.00) | 1.00 | ✅ |
| 21 | `bus-0007` | difficult | business | After Microsoft's 2019 investment, which cloud platform became… | D. Azure | D (1.00) | 1.00 | ✅ |
| 22 | `bus-0008` | easy | business | Bard's February 2023 demo error wrongly credited which telesco… | B. James Webb Space Telescope | B (0.63) | 0.50 | ✅ |
| 23 | `bus-0009` | difficult | business | Which startup did Databricks agree to acquire for about $1.3 b… | D. MosaicML | D (1.00) | 1.00 | ✅ |
| 24 | `bus-0010` | difficult | business | Which company hired most of Inflection AI's team and licensed … | A. Microsoft | A (0.83) | 0.78 | ✅ |
| 25 | `bus-0011` | easy | business | Which trio of companies created the Stargate venture announced… | C. OpenAI, SoftBank and Oracle | C (0.77) | 0.68 | ✅ |
| 26 | `bus-0012` | medium | business | Whom did Elon Musk sue in early 2024 over OpenAI allegedly aba… | A. Sam Altman and OpenAI | A (0.99) | 0.99 | ✅ |
| 27 | `bus-0013` | medium | business | Which company announced a $6 billion Series B funding round in… | B. xAI | C (0.34) | 0.14 | ❌ |
| 28 | `bus-0014` | difficult | business | Which biometric does the Orb built for World scan to issue a W… | C. Iris | C (0.67) | 0.56 | ✅ |
| 29 | `con-0001` | medium | concepts | In information theory, what does a low perplexity indicate? | C. The model is good at predicting the… | C (1.00) | 1.00 | ✅ |
| 30 | `con-0002` | easy | concepts | A model is overfitting when it does what? | C. Fits the training data too closely … | C (1.00) | 1.00 | ✅ |
| 31 | `con-0003` | medium | concepts | Gradient descent is what kind of method? | A. An iterative optimisation method fo… | A (1.00) | 1.00 | ✅ |
| 32 | `con-0004` | easy | concepts | Dropout is a technique for reducing what problem in neural net… | D. Overfitting | D (1.00) | 1.00 | ✅ |
| 33 | `con-0005` | medium | concepts | What does backpropagation compute? | D. The gradient of the loss with respe… | D (1.00) | 1.00 | ✅ |
| 34 | `con-0006` | medium | concepts | A latent space is best described as what? | C. A space where similar items sit clo… | C (1.00) | 1.00 | ✅ |
| 35 | `con-0007` | medium | concepts | Zero-shot learning is a setup where the learner sees what duri… | D. No examples at all of the test time… | D (1.00) | 1.00 | ✅ |
| 36 | `con-0008` | easy | concepts | What does the ReLU activation function do? | D. Outputs the non negative part of it… | D (1.00) | 1.00 | ✅ |
| 37 | `con-0009` | medium | concepts | What does the softmax function convert a tuple of numbers into? | D. A probability distribution over the… | D (1.00) | 1.00 | ✅ |
| 38 | `con-0010` | easy | concepts | What is an epoch in neural network training? | A. One full pass through the entire tr… | A (1.00) | 1.00 | ✅ |
| 39 | `con-0011` | easy | concepts | What is a token in a large language model? | D. A unit of text the model processes | D (1.00) | 1.00 | ✅ |
| 40 | `con-0012` | medium | concepts | What is limited by a language model context window? | D. The text it can consider at once | D (1.00) | 1.00 | ✅ |
| 41 | `con-0013` | easy | concepts | What is a hallucination in artificial intelligence? | A. A confident but false model output | A (1.00) | 1.00 | ✅ |
| 42 | `con-0014` | medium | concepts | What does the temperature setting control when generating text… | D. How random the word choices are | D (1.00) | 1.00 | ✅ |
| 43 | `con-0015` | difficult | concepts | What do neural scaling laws describe? | A. Gains from scaling models and data | A (1.00) | 1.00 | ✅ |
| 44 | `con-0016` | medium | concepts | What is chain-of-thought prompting? | D. Getting step-by-step reasoning | D (1.00) | 1.00 | ✅ |
| 45 | `con-0017` | medium | concepts | What is the core training objective of a GPT-style large langu… | A. Predicting the next token from prio… | A (1.00) | 1.00 | ✅ |
| 46 | `con-0018` | medium | concepts | What makes text generation by most large language models autor… | A. It emits one token at a time condit… | A (1.00) | 1.00 | ✅ |
| 47 | `con-0019` | difficult | concepts | What did the GPT-3 paper show about few-shot prompting? | A. It lets a model do tasks from examp… | A (1.00) | 1.00 | ✅ |
| 48 | `con-0020` | difficult | concepts | What do query, key and value vectors do in attention? | A. They weight every token by relevanc… | A (1.00) | 1.00 | ✅ |
| 49 | `con-0021` | medium | concepts | How does a vector database help a language model use stored kn… | A. By retrieving texts whose embedding… | A (1.00) | 1.00 | ✅ |
| 50 | `con-0022` | easy | concepts | Which cost recurs every time a deployed model answers a query? | B. Inference compute | B (1.00) | 1.00 | ✅ |
| 51 | `eth-0001` | medium | ethics | In AI safety, what does "alignment" mean? | B. Steering a system toward a person's… | B (1.00) | 1.00 | ✅ |
| 52 | `eth-0002` | medium | ethics | Reward hacking happens when a reinforcement learning system do… | A. A student copying answers instead o… | A (0.99) | 0.98 | ✅ |
| 53 | `eth-0003` | difficult | ethics | When did the European Union's Artificial Intelligence Act ente… | C. 1 August 2024 | C (0.78) | 0.71 | ✅ |
| 54 | `eth-0004` | medium | ethics | Algorithmic bias is defined as what kind of problem? | A. A systematic and repeatable unfair … | A (1.00) | 1.00 | ✅ |
| 55 | `eth-0005` | difficult | ethics | Margaret Mitchell is best known for research on automatically … | C. Unwanted demographic biases | C (0.97) | 0.95 | ✅ |
| 56 | `eth-0006` | easy | ethics | What is a red team in the context of AI safety? | C. A group that attacks systems to fin… | C (1.00) | 1.00 | ✅ |
| 57 | `eth-0007` | medium | ethics | A foundation model is trained on a large general purpose datas… | C. A large language model such as GPT | C (1.00) | 1.00 | ✅ |
| 58 | `eth-0008` | difficult | ethics | Which famous 2023 paper argued that large language models show… | D. The Emergent Abilities of Large Lan… | D (0.92) | 0.89 | ✅ |
| 59 | `eth-0009` | medium | ethics | What does p(doom) mean in AI safety culture? | B. The chance that AI causes an existe… | B (1.00) | 1.00 | ✅ |
| 60 | `eth-0010` | easy | ethics | Which organization published the March 2023 open letter callin… | B. Future of Life Institute | D (0.96) | 0.94 | ❌ |
| 61 | `eth-0011` | difficult | ethics | Which thesis holds that intelligence and final goals are indep… | C. Orthogonality thesis | C (1.00) | 1.00 | ✅ |
| 62 | `eth-0012` | medium | ethics | Which movement treats positively influencing the long-term fut… | B. Longtermism | B (1.00) | 1.00 | ✅ |
| 63 | `eth-0013` | difficult | ethics | What is the AI safety term for an agent that permits shutdown … | D. Corrigibility | D (1.00) | 1.00 | ✅ |
| 64 | `eth-0014` | easy | ethics | Which physicist warned that success in creating AI could spell… | D. Stephen Hawking | D (1.00) | 1.00 | ✅ |
| 65 | `eth-0015` | medium | ethics | Which engineer claimed Google's LaMDA chatbot was sentient in … | B. Blake Lemoine | B (1.00) | 1.00 | ✅ |
| 66 | `eth-0016` | medium | ethics | Which term describes tricks like DAN and the grandma routine t… | B. Jailbreak | B (0.97) | 0.97 | ✅ |
| 67 | `eth-0017` | difficult | ethics | What did the 2024 tribunal hold in the Air Canada chatbot refu… | D. The airline is liable for errors it… | D (0.98) | 0.97 | ✅ |
| 68 | `eth-0018` | difficult | ethics | What does the First Law of Asimov's Three Laws of Robotics req… | C. A robot must never harm a human or … | C (1.00) | 1.00 | ✅ |
| 69 | `eth-0019` | easy | ethics | Which actress said OpenAI's Sky voice sounded eerily similar t… | C. Scarlett Johansson | C (0.61) | 0.48 | ✅ |
| 70 | `eth-0020` | difficult | ethics | Which declaration was signed at the UK AI Safety Summit in Nov… | C. Bletchley Declaration | C (1.00) | 1.00 | ✅ |
| 71 | `hwr-0001` | easy | hardware | Why are GPUs the default hardware for training large neural ne… | A. Because they accelerate the linear … | A (1.00) | 1.00 | ✅ |
| 72 | `hwr-0002` | easy | hardware | Which Google chip is an application specific integrated circui… | C. The Tensor Processing Unit | C (1.00) | 1.00 | ✅ |
| 73 | `hwr-0003` | easy | hardware | What does CUDA stand for? | A. Compute Unified Device Architecture | A (1.00) | 1.00 | ✅ |
| 74 | `hwr-0004` | difficult | hardware | High Bandwidth Memory stacks DRAM dies vertically. Which three… | C. Samsung, AMD and SK Hynix | C (0.73) | 0.64 | ✅ |
| 75 | `hwr-0005` | difficult | hardware | Nvidia's Hopper microarchitecture is designed primarily for wh… | A. Datacenter workloads | A (1.00) | 1.00 | ✅ |
| 76 | `hwr-0006` | medium | hardware | Nvidia's Ampere GPU microarchitecture is named after which per… | A. Andre-Marie Ampere | A (1.00) | 1.00 | ✅ |
| 77 | `hwr-0007` | difficult | hardware | Which company builds the wafer scale engine, a processor built… | D. Cerebras Systems | D (1.00) | 1.00 | ✅ |
| 78 | `hwr-0008` | easy | hardware | An NPU, also called an AI accelerator, is best described as what? | A. A specialised hardware accelerator … | A (1.00) | 1.00 | ✅ |
| 79 | `hwr-0009` | easy | hardware | Moore's law says the number of transistors on an integrated ci… | C. Doubles roughly every two years at … | C (1.00) | 1.00 | ✅ |
| 80 | `hwr-0010` | difficult | hardware | Nvidia was founded in 1993 by Jensen Huang and two co-founders… | B. Chris Malachowsky and Curtis Priem | B (1.00) | 1.00 | ✅ |
| 81 | `hwr-0011` | medium | hardware | Which foundry manufactures most of Nvidia's AI chips and was f… | D. TSMC | D (1.00) | 1.00 | ✅ |
| 82 | `hwr-0012` | medium | hardware | Which company is the sole supplier of extreme ultraviolet lith… | D. ASML | D (1.00) | 1.00 | ✅ |
| 83 | `hwr-0013` | difficult | hardware | Nvidia's Blackwell architecture is named after which person? | C. David Blackwell | C (1.00) | 0.99 | ✅ |
| 84 | `hwr-0014` | easy | hardware | Which Nvidia chip became the workhorse of AI training during t… | A. H100 | A (0.77) | 0.69 | ✅ |
| 85 | `hwr-0015` | difficult | hardware | How many GPUs did Nvidia's DGX-1 contain, the system whose fir… | D. 8 | D (0.98) | 0.98 | ✅ |
| 86 | `hwr-0016` | difficult | hardware | What does the LPU in Groq's chip name stand for? | B. Language Processing Unit | B (0.94) | 0.92 | ✅ |
| 87 | `hst-0001` | easy | history | Which 1956 summer workshop is widely considered the founding e… | A. The Dartmouth workshop | A (1.00) | 1.00 | ✅ |
| 88 | `hst-0002` | easy | history | Which researcher coined the term "artificial intelligence" whi… | B. John McCarthy | B (1.00) | 1.00 | ✅ |
| 89 | `hst-0003` | medium | history | Which American psychologist built the perceptron, the first tr… | D. Frank Rosenblatt | D (1.00) | 1.00 | ✅ |
| 90 | `hst-0004` | medium | history | Which MIT researcher wrote ELIZA between 1964 and 1967, the pr… | C. Joseph Weizenbaum | C (1.00) | 1.00 | ✅ |
| 91 | `hst-0005` | medium | history | Which IBM researcher coined the term "machine learning" in 1959? | B. Arthur Samuel | B (1.00) | 1.00 | ✅ |
| 92 | `hst-0006` | easy | history | In the history of AI, what does the term "AI winter" refer to? | D. A period when funding and interest … | D (1.00) | 1.00 | ✅ |
| 93 | `hst-0007` | difficult | history | Which long-running project set out to encode common sense know… | D. Cyc | D (1.00) | 1.00 | ✅ |
| 94 | `hst-0008` | medium | history | Which programming language did John McCarthy develop, and did … | D. Lisp | D (1.00) | 1.00 | ✅ |
| 95 | `hst-0009` | difficult | history | MYCIN diagnosed blood infections and recommended antibiotics. … | B. An early backward chaining expert s… | B (1.00) | 1.00 | ✅ |
| 96 | `hst-0010` | medium | history | In 1997, Deep Blue became the first computer to win a match ag… | D. Garry Kasparov | D (1.00) | 1.00 | ✅ |
| 97 | `lab-0001` | easy | labs | Which series of models is OpenAI best known for developing? | B. The GPT series of large language mo… | B (1.00) | 1.00 | ✅ |
| 98 | `lab-0002` | easy | labs | Anthropic and OpenAI are both headquartered in the same Americ… | C. San Francisco | C (0.93) | 0.90 | ✅ |
| 99 | `lab-0003` | medium | labs | Which French AI company, founded in 2023 and based in Paris, i… | B. Mistral AI | B (1.00) | 1.00 | ✅ |
| 100 | `lab-0004` | medium | labs | Which Hangzhou based AI company develops open weight models an… | D. DeepSeek | D (0.78) | 0.72 | ✅ |
| 101 | `lab-0005` | difficult | labs | Which Seattle based non-profit research institute was founded … | B. Allen Institute for AI | B (0.64) | 0.52 | ✅ |
| 102 | `lab-0006` | easy | labs | Which lab was founded in 2010, acquired by Google in 2014, and… | A. DeepMind | A (1.00) | 1.00 | ✅ |
| 103 | `lab-0007` | medium | labs | Which Toronto based company focuses on large language models f… | D. Cohere | D (1.00) | 1.00 | ✅ |
| 104 | `lab-0008` | medium | labs | In which year did Google merge DeepMind with its Google Brain … | A. 2023 | C (0.51) | 0.35 | ❌ |
| 105 | `lab-0009` | easy | labs | Which lab develops the Claude family of AI models? | A. Anthropic | A (1.00) | 0.99 | ✅ |
| 106 | `lab-0010` | easy | labs | Which lab develops the Gemini family of AI models? | D. Google DeepMind | D (1.00) | 1.00 | ✅ |
| 107 | `lab-0011` | easy | labs | Which lab develops the Llama family of AI models? | A. Meta AI | A (0.98) | 0.96 | ✅ |
| 108 | `lab-0013` | medium | labs | Which former OpenAI chief scientist co-founded Safe Superintel… | A. Ilya Sutskever | A (0.83) | 0.78 | ✅ |
| 109 | `lab-0014` | medium | labs | Which former OpenAI chief technology officer founded Thinking … | A. Mira Murati | C (0.59) | 0.45 | ❌ |
| 110 | `lab-0015` | medium | labs | What does World Labs, the startup founded by Fei-Fei Li, build? | A. Large world models for 3D space | A (1.00) | 1.00 | ✅ |
| 111 | `lab-0016` | difficult | labs | Which AI lab was created by Google LaMDA developers Noam Shaze… | C. Character.ai | C (0.98) | 0.97 | ✅ |
| 112 | `mem-0001` | easy | memes | What does HAL stand for in Stanley Kubrick's 2001: A Space Ody… | D. Heuristically Programmed Algorithmi… | D (0.99) | 0.99 | ✅ |
| 113 | `mem-0002` | easy | memes | In the Terminator franchise, what is the name of the artificia… | A. Skynet | A (1.00) | 1.00 | ✅ |
| 114 | `mem-0003` | medium | memes | Which Microsoft Office character is the animated paperclip kno… | C. The Clippit character | C (1.00) | 0.99 | ✅ |
| 115 | `mem-0004` | medium | memes | ELIZA, the 1960s program, is still used to demonstrate what? | C. That pattern matching alone can imi… | C (1.00) | 1.00 | ✅ |
| 116 | `mem-0005` | difficult | memes | Microsoft Bob was released in 1995. What was it? | B. A replacement for the Windows Progr… | B (1.00) | 1.00 | ✅ |
| 117 | `mem-0006` | medium | memes | AlphaGo's win over Lee Sedol in March 2016 was a first for com… | B. Beat a 9-dan professional without a… | B (1.00) | 0.99 | ✅ |
| 118 | `mem-0007` | difficult | memes | Model collapse, the degradation caused by training on generate… | D. Mad cow disease | D (0.93) | 0.90 | ✅ |
| 119 | `mem-0008` | difficult | memes | Among Us, released in 2018, became a meme for a specific reaso… | D. Its gameplay was used in a popular … | A (0.49) | 0.32 | 🟡 |
| 120 | `mem-0009` | easy | memes | Which Lovecraft creature appears in the AI meme as a giant ten… | B. Shoggoth | D (0.57) | 0.42 | 🟡 |
| 121 | `mem-0010` | medium | memes | On which forum was Roko's basilisk first posted as a thought e… | D. LessWrong | D (1.00) | 1.00 | ✅ |
| 122 | `mem-0011` | medium | memes | What does the AI doomer phrase 'instrumental convergence' clai… | A. They tend to pursue similar instrum… | A (1.00) | 1.00 | ✅ |
| 123 | `mem-0012` | easy | memes | Which movement abbreviates itself as e/acc? | B. Effective accelerationism | B (0.98) | 0.97 | ✅ |
| 124 | `mem-0013` | easy | memes | Which group do e/acc supporters call decels? | A. Decelerationists | A (0.90) | 0.86 | ✅ |
| 125 | `mem-0014` | easy | memes | Which Microsoft chatbot revealed its hidden Sydney persona in … | A. Bing Chat | A (1.00) | 1.00 | ✅ |
| 126 | `mem-0015` | difficult | memes | In which game of the 2016 AlphaGo versus Lee Sedol match did A… | C. Game 2 | C (0.80) | 0.73 | ✅ |
| 127 | `mem-0016` | difficult | memes | Which researcher co-authored the 2021 paper On the Dangers of … | B. Emily M. Bender | B (1.00) | 1.00 | ✅ |
| 128 | `mem-0017` | easy | memes | Which company's chatbot Tay posted offensive tweets and was ta… | B. Microsoft | B (1.00) | 1.00 | ✅ |
| 129 | `mem-0018` | medium | memes | Which image generator produced the viral 2023 picture of the P… | C. Midjourney | C (0.54) | 0.38 | ✅ |
| 130 | `mem-0019` | easy | memes | Which actor is shown eating spaghetti in the viral 2023 AI vid… | A. Will Smith | A (0.45) | 0.26 | ✅ |
| 131 | `mem-0020` | medium | memes | Which fashion house titles the viral 2023 AI-generated Harry P… | B. Balenciaga | B (0.89) | 0.85 | ✅ |
| 132 | `mem-0021` | difficult | memes | Which technique surfaced Loab, the 2022 AI-generated cryptid, … | D. Negative prompt weighting | D (0.99) | 0.97 | ✅ |
| 133 | `mem-0022` | medium | memes | Which phrase became shorthand for low-quality AI content after… | A. AI slop | A (0.99) | 0.99 | ✅ |
| 134 | `mem-0023` | difficult | memes | On which forum was the dead Internet theory first popularized … | C. Agora Road | A (0.33) | 0.12 | ❌ |
| 135 | `mem-0024` | easy | memes | Which product's AI Overviews told users to add glue to pizza i… | B. Google Search | B (0.76) | 0.68 | ✅ |
| 136 | `mem-0025` | easy | memes | Who coined the term vibe coding in February 2025? | A. Andrej Karpathy | A (0.76) | 0.68 | ✅ |
| 137 | `mem-0026` | medium | memes | Which film depicts humans living in a simulated reality built … | C. The Matrix | C (1.00) | 1.00 | ✅ |
| 138 | `mod-0001` | easy | models | GPT stands for generative pre-trained transformer. What does t… | C. A neural network architecture based… | C (1.00) | 1.00 | ✅ |
| 139 | `mod-0002` | medium | models | OpenAI released GPT-3 in 2020. Roughly how many parameters did… | C. 175 billion | C (1.00) | 1.00 | ✅ |
| 140 | `mod-0003` | difficult | models | Google's Gemini family of models took its name partly from NAS… | A. Because the models are named after … | A (1.00) | 1.00 | ✅ |
| 141 | `mod-0004` | medium | models | Meta's Llama series expands its own name into a backronym. Wha… | B. Large Language Model Meta AI | B (0.99) | 0.98 | ✅ |
| 142 | `mod-0005` | easy | models | Stable Diffusion, released in 2022, generates images using whi… | C. Diffusion | C (1.00) | 1.00 | ✅ |
| 143 | `mod-0006` | easy | models | DALL-E, DALL-E 2 and DALL-E 3 are all text to image models fro… | C. OpenAI | C (1.00) | 1.00 | ✅ |
| 144 | `mod-0007` | medium | models | BERT differs from GPT in one architectural way that changed th… | D. It is encoder only and reads text i… | D (1.00) | 1.00 | ✅ |
| 145 | `mod-0008` | medium | models | GPT-2 was pre-trained on a dataset of how many web pages? | B. 8 million | B (0.64) | 0.52 | ✅ |
| 146 | `mod-0009` | easy | models | ChatGPT was first released on which date? | C. November 30, 2022 | C (1.00) | 1.00 | ✅ |
| 147 | `mod-0010` | difficult | models | AlphaGo Zero differed from earlier AlphaGo versions in one imp… | B. It learned entirely from self play … | B (1.00) | 1.00 | ✅ |
| 148 | `mod-0011` | easy | models | Which company released GPT-4 in March 2023? | B. OpenAI | B (1.00) | 1.00 | ✅ |
| 149 | `mod-0012` | medium | models | Which model was the first widely released large reasoning mode… | A. OpenAI o1 | A (0.69) | 0.59 | ✅ |
| 150 | `mod-0013` | difficult | models | What made DeepSeek-R1 notable when it launched in January 2025? | D. Open weights with frontier-level ma… | D (1.00) | 1.00 | ✅ |
| 151 | `mod-0014` | difficult | models | What is Constitutional AI, the technique Anthropic introduced … | A. Training guided by a written consti… | A (1.00) | 1.00 | ✅ |
| 152 | `mod-0015` | medium | models | What made Meta's Llama 2 release in July 2023 significant comp… | B. Its weights were released free for … | B (1.00) | 1.00 | ✅ |
| 153 | `mod-0016` | difficult | models | What architecture does Mistral's Mixtral 8x7B, released in Dec… | A. Sparse mixture of experts with rout… | A (1.00) | 1.00 | ✅ |
| 154 | `mod-0017` | easy | models | What does OpenAI's Sora, previewed in February 2024, generate? | B. Short video clips from text prompts | B (1.00) | 1.00 | ✅ |
| 155 | `mod-0018` | difficult | models | Which model first offered a 1-million-token context window in … | D. Gemini 1.5 Pro | A (0.63) | 0.51 | ❌ |
| 156 | `mod-0019` | easy | models | Which company develops the Qwen family of language models? | B. Alibaba | B (1.00) | 1.00 | ✅ |
| 157 | `mod-0020` | easy | models | Which company develops the Grok family of models? | C. xAI | C (1.00) | 1.00 | ✅ |
| 158 | `mod-0021` | medium | models | What does OpenAI's Whisper, released as open-source software i… | A. Transcribes and translates speech i… | A (1.00) | 1.00 | ✅ |
| 159 | `mod-0022` | medium | models | What does the "o" stand for in GPT-4o, released in May 2024? | C. Omni | C (1.00) | 1.00 | ✅ |
| 160 | `mod-0023` | medium | models | Anthropic's assistant Claude was named after which computer sc… | B. Claude Shannon | B (1.00) | 1.00 | ✅ |
| 161 | `mod-0024` | medium | models | The word Grok, used for xAI's chatbot, comes from which scienc… | A. Stranger in a Strange Land | A (1.00) | 1.00 | ✅ |
| 162 | `mod-0025` | easy | models | The name DALL-E combines artist Salvador Dali with which movie… | A. WALL-E | A (0.99) | 0.98 | ✅ |
| 163 | `mod-0026` | easy | models | Google's chatbot Bard was renamed to what in 2024? | C. Gemini | C (1.00) | 1.00 | ✅ |
| 164 | `mod-0027` | easy | models | GitHub Copilot was built through a partnership between GitHub … | C. GitHub and OpenAI | C (1.00) | 1.00 | ✅ |
| 165 | `mod-0028` | easy | models | DeepMind's AlphaGo famously mastered which board game? | B. Go | B (1.00) | 1.00 | ✅ |
| 166 | `mod-0029` | medium | models | DeepMind's AlphaFold is famous for predicting what? | D. Protein structures | D (1.00) | 1.00 | ✅ |
| 167 | `mod-0030` | easy | models | The ChatGPT product generates which of the following in respon… | D. Text, speech, and images | D (0.98) | 0.97 | ✅ |
| 168 | `mod-0031` | easy | models | What does the AI tool Midjourney generate? | C. Images from text descriptions | C (1.00) | 1.00 | ✅ |
| 169 | `mod-0032` | easy | models | What does GitHub Copilot help programmers do? | A. Write code with AI suggestions | A (1.00) | 1.00 | ✅ |
| 170 | `mod-0033` | medium | models | How did OpenAI release the Whisper speech recognition model in… | C. As free open-source software | C (1.00) | 1.00 | ✅ |
| 171 | `mod-0034` | easy | models | To make an image with OpenAI's DALL-E, what does the user prov… | C. A written description of the image | C (1.00) | 1.00 | ✅ |
| 172 | `mod-0035` | easy | models | Claude, first released in March 2023, is what kind of product? | B. An AI chatbot assistant | B (1.00) | 1.00 | ✅ |
| 173 | `mod-0036` | medium | models | What made Stable Diffusion's 2022 release unusual among image … | C. Its code and weights were released … | C (1.00) | 1.00 | ✅ |
| 174 | `mod-0037` | easy | models | What style of interaction made ChatGPT famous when it launched? | B. Back-and-forth chat that remembers … | B (1.00) | 1.00 | ✅ |
| 175 | `mod-0039` | medium | models | Which Chinese technology company developed the chatbot Ernie B… | C. Baidu | C (1.00) | 1.00 | ✅ |
| 176 | `mod-0040` | medium | models | Google's Gemini family of models, announced in December 2023, … | A. LaMDA and PaLM 2 | A (1.00) | 1.00 | ✅ |
| 177 | `mod-0041` | easy | models | Which country is the AI lab behind the DeepSeek R1 reasoning m… | B. China | B (1.00) | 1.00 | ✅ |
| 178 | `mod-0042` | medium | models | Which model family did Meta release with downloadable weights … | D. Llama | D (0.99) | 0.99 | ✅ |
| 179 | `mod-0043` | easy | models | Which Go world champion did DeepMind's AlphaGo beat in the hig… | C. Lee Sedol | C (0.97) | 0.95 | ✅ |
| 180 | `mod-0044` | easy | models | Which company built AlphaGo, the Go-playing system that beat L… | A. DeepMind | A (1.00) | 1.00 | ✅ |
| 181 | `mod-0045` | easy | models | In which year did Stability AI release Stable Diffusion? | D. 2022 | D (1.00) | 0.99 | ✅ |
| 182 | `mod-0047` | easy | models | What did Google put BERT to work on inside its own products? | A. Ranking search results | A (1.00) | 1.00 | ✅ |
| 183 | `mod-0048` | medium | models | The live voice demo of GPT-4o in May 2024 was compared to whic… | B. Her, the 2013 Spike Jonze film | B (0.99) | 0.99 | ✅ |
| 184 | `mod-0049` | easy | models | ChatGPT launched in November 2022 and is often credited with m… | D. Ordinary people could talk to a mod… | D (1.00) | 1.00 | ✅ |
| 185 | `mod-0050` | easy | models | ELIZA, the 1960s program widely credited as the first chatbot,… | D. Massachusetts Institute of Technolo… | D (1.00) | 1.00 | ✅ |
| 186 | `mod-0051` | medium | models | How long did Microsoft's Tay chatbot stay online in 2016? | A. 16 hours | A (0.98) | 0.97 | ✅ |
| 187 | `mod-0052` | easy | models | Which company's question-answering system beat the reigning ch… | A. IBM | A (1.00) | 1.00 | ✅ |
| 188 | `mod-0053` | medium | models | The chess computer Deep Blue became the first to beat a reigni… | D. 1997 | D (1.00) | 1.00 | ✅ |
| 189 | `mod-0054` | medium | models | Character.ai, the companion chatbot service launched in 2023, … | D. Noam Shazeer and Daniel de Freitas | D (1.00) | 1.00 | ✅ |
| 190 | `mod-0055` | medium | models | What distinguishes Perplexity, the search startup founded in 2… | B. It answers with a written summary t… | B (1.00) | 1.00 | ✅ |
| 191 | `mod-0056` | medium | models | What is Adobe Firefly, released in 2023, a family of models for? | D. Creative production work in design … | D (1.00) | 1.00 | ✅ |
| 192 | `mod-0057` | medium | models | Replika, released in November 2017, builds each personal chatb… | B. By having the user answer a series … | B (0.97) | 0.96 | ✅ |
| 193 | `mod-0058` | medium | models | In the Markov chain model, what does the probability of each n… | C. Only the state of the immediately p… | C (1.00) | 1.00 | ✅ |
| 194 | `mod-0059` | medium | models | DeepMind's MuZero learned chess, Go and shogi in 2019. How was… | B. It was never told the rules of the … | B (0.92) | 0.90 | ✅ |
| 195 | `mod-0060` | medium | models | An autoencoder compresses its input into a smaller internal co… | B. Rebuild the original input from the… | B (1.00) | 1.00 | ✅ |
| 196 | `mod-0061` | easy | models | The Turing test asks a human evaluator to judge which of two t… | B. Which participant is the human and … | B (1.00) | 1.00 | ✅ |
| 197 | `oss-0001` | easy | open-source | What is Hugging Face best known for? | B. A repository for sharing models and… | B (1.00) | 1.00 | ✅ |
| 198 | `oss-0002` | medium | open-source | Open weights means what exactly? | A. The learned parameters are publicly… | A (1.00) | 1.00 | ✅ |
| 199 | `oss-0003` | easy | open-source | PyTorch was originally developed at which company? | A. Meta | A (1.00) | 1.00 | ✅ |
| 200 | `oss-0004` | medium | open-source | Under which licence is TensorFlow released? | C. The Apache Licence 2.0 | C (1.00) | 0.99 | ✅ |
| 201 | `oss-0005` | medium | open-source | EleutherAI was formed in 2020 with a specific goal. What was it? | A. To create an open source version of… | A (0.98) | 0.96 | ✅ |
| 202 | `oss-0006` | medium | open-source | Common Crawl is best known in AI for what? | D. Publishing a large public web archi… | D (1.00) | 1.00 | ✅ |
| 203 | `oss-0007` | difficult | open-source | Which organization published the Open Source AI Definition 1.0… | A. Open Source Initiative | A (0.78) | 0.71 | ✅ |
| 204 | `oss-0008` | difficult | open-source | Under which license were the BLOOM model weights released in 2… | D. Responsible AI License (RAIL) | D (0.77) | 0.70 | ✅ |
| 205 | `oss-0009` | medium | open-source | Which organization created The Pile dataset used to train many… | C. EleutherAI | C (1.00) | 1.00 | ✅ |
| 206 | `oss-0010` | medium | open-source | Who started the llama.cpp project for running large language m… | A. Georgi Gerganov | A (1.00) | 1.00 | ✅ |
| 207 | `pap-0001` | medium | papers | How many authors are credited on the 2017 paper "Attention Is … | D. Eight | D (0.79) | 0.71 | ✅ |
| 208 | `pap-0002` | medium | papers | AlexNet is often called the paper that started the deep learni… | D. The ImageNet Large Scale Visual Rec… | D (1.00) | 1.00 | ✅ |
| 209 | `pap-0003` | difficult | papers | AlexNet classifies images into how many distinct object catego… | C. 1,000 | C (1.00) | 1.00 | ✅ |
| 210 | `pap-0004` | easy | papers | The transformer paper was written at which company? | D. Google | D (0.99) | 0.99 | ✅ |
| 211 | `pap-0005` | medium | papers | Word2Vec represents words as vectors using what principle? | C. Using the surrounding words to capt… | C (1.00) | 1.00 | ✅ |
| 212 | `pap-0006` | medium | papers | BERT was introduced in 2018 by researchers at which company? | D. Google | D (1.00) | 1.00 | ✅ |
| 213 | `pap-0007` | medium | papers | The 2012 AlexNet paper depended on a large labelled image data… | A. ImageNet, a dataset of hand-labelle… | A (1.00) | 1.00 | ✅ |
| 214 | `pap-0008` | difficult | papers | The 2015 paper that introduced residual networks won which com… | C. The ImageNet challenge | C (0.93) | 0.91 | ✅ |
| 215 | `ppl-0001` | easy | people | Which researcher has earned the title "the Godfather of AI"? | B. Geoffrey Hinton | C (0.76) | 0.67 | ❌ |
| 216 | `ppl-0002` | easy | people | Which researcher built the ImageNet dataset and has been calle… | D. Fei-Fei Li | D (1.00) | 1.00 | ✅ |
| 217 | `ppl-0003` | medium | people | In 2024, which AI researcher shared the Nobel Prize in Chemist… | C. Demis Hassabis | C (0.74) | 0.65 | ✅ |
| 218 | `ppl-0004` | medium | people | Which researcher co-created AlexNet alongside Alex Krizhevsky … | D. Ilya Sutskever | D (0.99) | 0.99 | ✅ |
| 219 | `ppl-0005` | difficult | people | Which researcher founded DAIR, the Distributed AI Research Ins… | A. Timnit Gebru | A (0.52) | 0.37 | ✅ |
| 220 | `ppl-0006` | medium | people | Which scholar won the 1978 Nobel Memorial Prize in Economic Sc… | A. Herbert Simon | A (1.00) | 1.00 | ✅ |
| 221 | `ppl-0007` | easy | people | Who has been the chief executive officer of OpenAI since 2019? | B. Sam Altman | B (1.00) | 1.00 | ✅ |
| 222 | `ppl-0008` | easy | people | Which English mathematician designed the Turing test and is re… | A. Alan Turing | A (1.00) | 1.00 | ✅ |
| 223 | `ppl-0009` | medium | people | Which researcher was a cofounder and head of Google Brain, and… | B. Andrew Ng | B (0.98) | 0.97 | ✅ |
| 224 | `ppl-0010` | medium | people | Which researcher co-founded Anthropic with his sister, and had… | A. Dario Amodei | A (0.98) | 0.98 | ✅ |
| 225 | `ppl-0011` | medium | people | Who founded the community blog LessWrong and co-founded the Ma… | A. Eliezer Yudkowsky | A (1.00) | 1.00 | ✅ |
| 226 | `ppl-0012` | medium | people | Who wrote the 2014 book Superintelligence: Paths, Dangers, Str… | A. Nick Bostrom | A (1.00) | 1.00 | ✅ |
| 227 | `ppl-0013` | easy | people | Who developed convolutional neural networks in the 1980s and s… | B. Yann LeCun | B (1.00) | 1.00 | ✅ |
| 228 | `ppl-0014` | medium | people | Who founded the Quebec AI institute Mila and shared the 2018 T… | B. Yoshua Bengio | B (1.00) | 1.00 | ✅ |
| 229 | `ppl-0015` | easy | people | Who led Tesla Autopilot vision as director of AI and later bec… | B. Andrej Karpathy | B (1.00) | 1.00 | ✅ |
| 230 | `ppl-0016` | easy | people | Which OpenAI CTO became interim CEO immediately after Sam Altm… | B. Mira Murati | B (0.93) | 0.91 | ✅ |
| 231 | `ppl-0017` | medium | people | Who co-founded Mistral AI in 2023 and serves as its CEO after … | C. Arthur Mensch | C (0.94) | 0.91 | ✅ |
| 232 | `ppl-0018` | medium | people | Who founded the Chinese AI company DeepSeek after building the… | D. Liang Wenfeng | D (1.00) | 1.00 | ✅ |
| 233 | `ppl-0019` | medium | people | Who co-founded DeepMind and Inflection AI and became CEO of Mi… | A. Mustafa Suleyman | A (1.00) | 1.00 | ✅ |
| 234 | `ppl-0020` | difficult | people | Which Transformer co-author left Google to found Character.AI … | B. Noam Shazeer | B (0.95) | 0.93 | ✅ |
| 235 | `ppl-0021` | difficult | people | Which Transformer paper co-author went on to co-found and lead… | D. Aidan Gomez | D (0.92) | 0.90 | ✅ |
| 236 | `ppl-0022` | medium | people | Who succeeded Mira Murati as OpenAI interim CEO during the Nov… | B. Emmett Shear | D (0.52) | 0.37 | ❌ |
| 237 | `ppl-0023` | easy | people | Which leather-jacketed executive has led Nvidia as CEO since c… | B. Jensen Huang | B (1.00) | 1.00 | ✅ |
| 238 | `ppl-0024` | medium | people | Who became CEO of AMD in 2014 and led its turnaround? | A. Lisa Su | A (0.96) | 0.94 | ✅ |
| 239 | `ppl-0025` | easy | people | Who became CEO of Microsoft in 2014 and backed OpenAI with bil… | C. Satya Nadella | C (1.00) | 1.00 | ✅ |
| 240 | `ppl-0026` | easy | people | Which OpenAI co-founder left the lab and founded xAI in 2023? | D. Elon Musk | D (0.49) | 0.31 | ✅ |
| 241 | `ppl-0027` | difficult | people | Before co-founding Google Brain, Jeff Dean had already helped … | C. MapReduce | C (0.96) | 0.96 | ✅ |
| 242 | `ppl-0028` | difficult | people | Who is the first author of the 2015 ResNet paper on deep resid… | B. Kaiming He | B (1.00) | 0.99 | ✅ |
| 243 | `pro-0001` | medium | products | GitHub Copilot was first announced on what date? | A. June 29, 2021 | A (0.55) | 0.41 | ✅ |
| 244 | `pro-0002` | easy | products | Runway AI is a New York company best known for which product c… | C. Text to video generation | C (1.00) | 1.00 | ✅ |
| 245 | `pro-0003` | easy | products | ElevenLabs, founded in 2022, specialises in which area of AI? | B. Natural sounding speech synthesis | B (1.00) | 1.00 | ✅ |
| 246 | `pro-0004` | easy | products | Sora, previewed by OpenAI in February 2024, became generally a… | A. ChatGPT Plus and Pro subscribers | B (0.73) | 0.64 | ❌ |
| 247 | `pro-0005` | medium | products | Google's NotebookLM was renamed in 2025. What is it now called? | C. Gemini Notebook | C (0.43) | 0.25 | ✅ |
| 248 | `pro-0006` | difficult | products | What does the LM in the name NotebookLM stand for? | A. Language Model | A (1.00) | 1.00 | ✅ |
| 249 | `pro-0007` | easy | products | Which startup launched the screenless AI Pin wearable that flo… | C. Humane | C (1.00) | 1.00 | ✅ |
| 250 | `pro-0008` | medium | products | Which device unveiled at CES in January 2024 promised a large … | D. Rabbit R1 | D (1.00) | 1.00 | ✅ |
| 251 | `pro-0009` | medium | products | Which image service runs through Discord after entering open b… | A. Midjourney | A (0.99) | 0.98 | ✅ |
| 252 | `pro-0010` | medium | products | Which NotebookLM feature that turns documents into podcast-sty… | B. Audio Overviews | B (1.00) | 1.00 | ✅ |
| 253 | `pro-0011` | difficult | products | Which label had the AI track Heart on My Sleeve pulled from st… | C. Universal Music Group | C (0.98) | 0.97 | ✅ |
| 254 | `pro-0012` | medium | products | How many users did ChatGPT gain in its first two months after … | B. 100 million users | B (1.00) | 0.99 | ✅ |
| 255 | `tec-0001` | medium | technology | The 2017 paper "Attention Is All You Need" described a model a… | B. The recurrent or convolutional stac… | B (1.00) | 1.00 | ✅ |
| 256 | `tec-0002` | difficult | technology | Attention had already been used in sequence models before the … | B. The Bahdanau attention paper | B (1.00) | 0.99 | ✅ |
| 257 | `tec-0003` | easy | technology | What does RAG stand for in the context of large language models? | B. Retrieval augmented generation | B (1.00) | 1.00 | ✅ |
| 258 | `tec-0004` | medium | technology | In RLHF, what is trained first and then used to score model ou… | B. A reward model from human preferenc… | B (1.00) | 1.00 | ✅ |
| 259 | `tec-0005` | medium | technology | In a mixture of experts model, what happens to the tokens that… | A. They are processed by only a subset… | A (0.98) | 0.97 | ✅ |
| 260 | `tec-0006` | medium | technology | Knowledge distillation transfers capability from a large model… | D. To let the small model run faster w… | D (1.00) | 1.00 | ✅ |
| 261 | `tec-0007` | medium | technology | The two networks in a generative adversarial network are train… | A. Classify real images from generated… | A (0.87) | 0.82 | ✅ |
| 262 | `tec-0008` | medium | technology | LSTM networks were designed to solve which problem in recurren… | B. The vanishing gradient problem | B (1.00) | 1.00 | ✅ |
| 263 | `tec-0009` | difficult | technology | ResNet won the 2015 ImageNet challenge by introducing a specif… | D. Learning residual functions with re… | D (1.00) | 1.00 | ✅ |
| 264 | `tec-0010` | easy | technology | Prompt engineering refers to what exactly? | D. Structuring natural language inputs… | D (1.00) | 1.00 | ✅ |
| 265 | `tec-0011` | easy | technology | What distinguishes an AI agent from a plain chatbot in current… | C. It pursues goals by using tools and… | C (1.00) | 1.00 | ✅ |
| 266 | `tec-0012` | difficult | technology | What does the ReAct method combine in an AI agent? | D. Reasoning traces and acting with to… | D (1.00) | 1.00 | ✅ |
| 267 | `tec-0013` | medium | technology | When did OpenAI introduce function calling for its chat models? | A. June 2023 | A (0.55) | 0.40 | ✅ |
| 268 | `tec-0014` | medium | technology | What is the Model Context Protocol introduced by Anthropic in … | D. An open standard connecting models … | D (1.00) | 1.00 | ✅ |
| 269 | `tec-0015` | difficult | technology | What problem does FlashAttention solve? | B. It computes exact attention with fa… | B (1.00) | 1.00 | ✅ |
| 270 | `tec-0016` | difficult | technology | What does grouped-query attention change compared with standar… | C. It shares key and value heads acros… | C (1.00) | 1.00 | ✅ |
| 271 | `tec-0017` | difficult | technology | How does LoRA adapt a large model to a new task? | B. It trains low-rank matrices while f… | B (1.00) | 1.00 | ✅ |
| 272 | `tec-0018` | difficult | technology | How does direct preference optimization differ from RLHF? | B. It tunes on preferences with no sep… | B (1.00) | 1.00 | ✅ |

## Observations

- **95.6% strict (260/272), 96.3% lenient.** Jev saturates this bank.
- **The difficulty ladder does not separate him.** 96% / 97% / 94% across easy / medium / difficult — Jev scores ~95% no matter how hard we label the question. The pilot's 100/90/80 split was n=10 noise; at n=272 the bank's difficulty labels predict almost nothing about Jev (only `difficulty 4` dips, and that's 6/7).
- **Category is the real signal.** Weak: `business` 86%, `labs` 87%, `memes` 88% — fast-moving facts (funding rounds, who merged with whom, meme provenance). Perfect scores: `benchmarks`, `concepts`, `hardware`, `history`, `open-source`, `papers`, `technology` — stable, definitional knowledge.
- **Confidence works, mostly.** Questions with confidence ≥ 0.5: **98.1% strict** (252/257). Below 0.5: **53.3%** (8/15). A 0.5 floor flags 15 questions, 7 of them wrong — useful triage. But **5 of 10 misses were confident** (up to `eth-0010` at 0.94), so no threshold catches confident-wrong, which is why strict stays the headline.
- **Dates, again.** `bus-0002` (year of the bubble) and `lab-0008` (year of the DeepMind/Google Brain merge) are year questions — the same documented jaggedness the pilot found.
- **Near-binary probabilities.** 221/272 answers came back with top-p ≥ 0.95; only 6 questions had Jev genuinely torn at the top. He commits.
- **The secondary rule rescued 2, both `memes`.** `mem-0008` and `mem-0009` — both unsure (conf 0.32 / 0.42), correct option 2nd at ~0.4. Torn, not ignorant.
- **The surprising misses are the easy ones.** `ppl-0001` ("Godfather of AI", conf 0.67 wrong), `eth-0010` (Future of Life Institute open letter, conf 0.94 wrong), `pro-0004` (Sora availability, conf 0.64 wrong) — trivia a human finds easy, answered with confidence. Jev is a judgment model doing trivia; the #39 roster still needs generative models for which recall is the job.
- **Speed and cost make this a free regression check.** 272 individual calls (each decision seeing only its own question — no context-rot risk) through a pool of 32: **4.5s, $0.0047**. One call per question at batched speed; the full pass is cheap enough to re-run on every bank edit.

## Raw data

Full per-question probabilities and option text: `data/eval/jev-full.json`.
