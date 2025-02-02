---
layout: post
title: std::move与std::forward代码分析
lang: zh-CN
---

在上一篇博客中我们知道了什么是移动语意以及完美转发，在这期间我们使用了两个新的std函数： std::move 与 std::forward。
>* std::move 的作用：将一个左值转换为一个右值
>* std::forward的作用：将实参的左右值属性在实参转发时完整保留。

我们理解了移动语意以及完美转发后，有必要探究一下std::move 与 std::forward两个函数的内部实现，这需要一些关于C++模板的基本知识：

<!--more--> 

#### 1. 模板的类型推断
对于这样一个模板：
```cpp
template <typename T>
void wrapper(T&& arg) {
  ......
}

int x=10;
wrapper(x);   // T => int&
wrapper(20);  // T => int
```
当实参是左值时，T会被推导为左值引用，也就是 int&，于是T&&就变为 int& &&, 根据引用折叠规则，int& && 等效于 int&;
当实参数右值时，T会被推倒为类型本身，也就是 int，于是T&&就变为int&&, 这是一个右值引用。
这就是T&&被称为通用引用的根本原因
#### 2.实参转发
在 C++ 中模板参数转发时，右值会被拷贝，失去原始的临时性，导致不必要的性能损失。
```cpp
void SomeFunc(int& x) { std::cout << "Lvalue reference called\n"; }
void SomeFunc(int&& x) { std::cout << "Rvalue reference called\n"; }

template <typename T>
void wrapper(T arg) {
    SomeFunc(arg);  // ⚠️ `arg` 永远是一个左值
}

int main() {
    int a = 10;
    wrapper(a);   // ✅ 调用了 SomeFunc(int&)
    wrapper(20);  // ❌ 期待调用 SomeFunc(int&&) 但错误地调用了 SomeFunc(int&)
}
```
#### 3.通用引用
**通用引用**，这是Scott Meyers自创的一个词，通俗地讲，通用引用是这样一个东西：它既能绑定左值又能绑定右值，在代码中一般长这个样子：T&&。通用引用有两个条件：
>* 必须精确地满足“T&&”这种形式，不能加const等修饰。
>* T必须是通过推断得到的，最常见的例如模板参数。

#### 4.引用折叠
C++模板的类型推导(Type Decuction)过程中的“引用折叠”规则：
- `T&  &`   → `T&`  
- `T&&  &`  → `T&`  
- `T&  &&`  → `T&`  
- `T&&  &&` → `T&&`  

#### 5. forward与remove_reference的实现

```cpp
//std::remove_reference的实现
template <typename T> 
struct remove_reference{ typedef T type}
template <typename T> 
struct remove_reference<T&>{ typedef T type}
template <typename T> 
struct remove_reference<T&&>{ typedef T type}

//std::move的实现
template<typename T>
typename std::remove_reference<T>::type&&  move(T&& arg){ 
    return static_cast<typename std::remove_reference<T>::type&&>(arg); 
 }

//std::forward的实现
template <typename T>
T&& forward(typename remove_reference<T>::type& arg){
	return static_cast<T&&>(arg);
}
```

在了解了C++模板的一些奇技淫巧之后，我们不难看出来，move函数啥都没干，只是将一个左值或者左值引用在编译期转换成一个右值引用。forward函数利用引用折叠规则，将实参是左值引用还是右值引用这个信息保留下来作为返回值。

简单来讲std::move 跟 std::forward只是在编译期做了个类型转换的工作：move返回一个右值引用，forward返回左值引用或者右值引用（参数是左值(引用)就返回左值引用，是右值（引用）就返回右值引用）——没有任何运行期的代码。

forward的代码理解起来要难于move, 但当你理解了模板的类型推断与引用折叠规则之后，就能够完全理解forward的工作原理了：
- 当arg是左值时,假设arg是int类型，T会被推导为 int&, 返回值T&&会被推导为 int& &&, 根据引用折叠规则，int& && 等效于 int&。
- 当arg是右值时，T会被推到为int, 返回值T&&会被推导为 int&&, 这是一个右值引用类型。

于是，forward实现了完美转发。