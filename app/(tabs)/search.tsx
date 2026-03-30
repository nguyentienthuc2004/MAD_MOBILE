import { Text, View, TextInput, StyleSheet } from "react-native";
import { useState } from "react";


const SearchScreen = () => {
  const [search, setSearch] = useState("");
  return (
    <View style={styles.container}>
      <View style={styles.centerRow}>
        <View style={styles.searchBarWrapper}>
          <TextInput
            style={styles.searchBar}
            placeholder="Tìm kiếm"
            placeholderTextColor="#aaa"
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>
      {/* Nội dung kết quả tìm kiếm sẽ hiển thị ở đây */}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 0,
  },
  centerRow: {
    width: '100%',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  searchBarWrapper: {
    width: '92%',
    backgroundColor: '#f4f4f4',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    justifyContent: 'center',
  },
  searchBar: {
    height: 44,
    fontSize: 17,
    paddingHorizontal: 18,
    backgroundColor: 'transparent',
    borderRadius: 20,
    color: '#222',
  },
});

export default SearchScreen;