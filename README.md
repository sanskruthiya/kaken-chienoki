## 知恵の木 - 科研費研究の全体概要マップ

- 科学研究費助成事業データベース（KAKEN）から取得した日本の科学研究の情報に基づく文書分散表現をインタラクティブに可視化するウェブマップです。


- 参照元：[KAKEN](https://kaken.nii.ac.jp/)
- デモサイト：[リンク](https://kashiwa.co-place.com/cmap/chienoki/)


### 作成要領
1. KAKENデータベースから情報取得
- 検索結果: 84,246件 / 開始年度: 2021 TO * AND 研究課題ステータス: 採択 OR 交付 OR 完了（2023/9/1時点）

2. データ整形と言語処理
- 取得したデータ項目を整形し、MeCAB（NEologd）の形態素解析による単語分割、FastTextの学習済みモデルによる文書のベクトル化、UMAPによる次元削減を実施して文書埋め込みデータを作成。
- 加えて、HDBSCANによるクラスタリングなどで補完データを生成。

- ベクトル化した文書データはdocs内にGeoJSON形式で格納したのでGIS上で読み込み可能。

3. 文書埋め込みデータの可視化
- 文書埋め込みデータはQGISを利用してGeoJSONに変換し、TippecanoeでPMTilesに変換。
- MapLibre GL JSによるウェブマップ化を実施。文字フォント用のglyphsデータはUNVT/NSFTを参照した。

### 参照情報
- [mecab-ipadic-NEologd](https://github.com/neologd/mecab-ipadic-neologd/blob/master/README.ja.md)
- [FastText](https://fasttext.cc/)
- [UMAP](https://umap-learn.readthedocs.io/en/latest/)
- [HDBSCAN](https://hdbscan.readthedocs.io/en/latest/how_hdbscan_works.html)
- [QGIS](https://qgis.org/ja/site/)
- [Tippecanoe](https://github.com/felt/tippecanoe)
- [MapLibre GL JS](https://maplibre.org/projects/maplibre-gl-js/)
- [UNVT/NSFT](https://github.com/unvt/nsft)
- [データ加工用リポジトリ](https://github.com/sanskruthiya/MapNLP/)
