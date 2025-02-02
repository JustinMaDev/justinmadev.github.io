---
layout: post
title: "C++14 and C++17 New Features – Everything You Need to Know"
---

### C++14 Features

Compared to C++11, C++14 introduces **only minor improvements**.  
The main change can be summarized in **one sentence**:  
👉 **Expanding the scope of automatic type deduction.**  

The remaining changes are mostly **small refinements**, including:

- **Function return type deduction**
- **Generic lambdas**

<!--more--> 
#### Function Return Type Deduction
```cpp
// Previously, it had to be written like this:
int func() {
    return 10;
}

// After C++14, it can be written like this:
auto func() {
    return 10;
}
```
If a function has **multiple return paths**, the programmer **must ensure that all return statements deduce the same type**,  
otherwise, a **compilation error** will occur.

Additionally, C++14 introduces a more advanced feature: **`decltype(auto)`**.  
We know that `decltype` is used to extract the type of an expression.  
But what happens when we **combine it with `auto`**?  
How is **`decltype(auto)` different from `auto`**?

To understand this, we first need to clarify the details and differences between `auto` and `decltype`.  
The type deduction rules for `auto` are largely based on **C++ template type deduction rules**.  
Let's first review the **C++ template type deduction rules**:

```cpp
template<typename T>
void func(ParamType param) { ... }
func(expr);
// The compiler deduces the type of `T` and `ParamType` based on the type of `expr` 
// (in many cases, `ParamType` is not the same as `T`).
template<typename T> void funcA(T param) {}
template<typename T> void funcB(T& param) {}
template<typename T> void funcC(T* param) {}
template<typename T> void funcD(T&& param) {}

int x = 1;
int& xr = x;
int* xp = &x;
const int xc = 4;
const int& xcr = x;
const int* xcp = &xc;

funcA(x);   // funcA<int>(int param)
funcA(xr);  // funcA<int>(int param)
funcA(xp);  // funcA<int*>(int* param)
funcA(xc);  // funcA<int>(int param)
funcA(xcr); // funcA<int>(int param)
funcA(xcp); // funcA<const int*>(const int* param)

funcB(x);   // funcB<int>(int& param);
funcB(xr);  // funcB<int>(int& param);
funcB(xp);  // funcB<int*>(int*& param);
funcB(xc);  // funcB<const int>(const int& param);
funcB(xcr); // funcB<const int>(const int& param);
funcB(xcp); // funcB<const int*>(const int*& param);
funcB(getObj()); // Compilation error (getObj returns an rvalue)

funcC(x);   // Compilation error
funcC(xp);  // Compilation error
funcC(xp);  // func<int>(int* param)
funcC(xcp); // funcC<const int>(const int* param);

funcD(x);   // funcD<int&>(int& param);
funcD(xr);  // funcD<int&>(int& param);
funcD(xp);  // funcD<int*&>(int*& param);
funcD(xc);  // funcD<const int&>(const int& param);
funcD(xcr); // funcD<const int&>(const int& param);
funcD(xcp); // funcD<const int*&>(const int*& param);
funcD(getObj()); // funcD<A>(A&&)
```
We divide `ParamType` into **three categories** to summarize the **template type deduction rules**.  
Once we understand these rules, we can use them to determine `T` and `ParamType` in the previous code examples.

#### **1. `ParamType` is neither a reference nor a pointer (Pass-by-Value)**
   - The compiler **copies `expr`** before passing it to the parameter.
   - **If `expr` is a reference, the reference part is ignored**.
   - **If `expr` has CV qualifiers (`const` or `volatile`), they are also ignored**.
   - **Exception**: If `expr` is a pointer, the **CV qualifiers of the pointed-to type** are retained,  
     but **the pointer itself loses its CV qualifiers**.

#### **2. `ParamType` is a regular reference (`T&`) or a pointer (`T*`)**
   - **If `expr` is a reference, the reference part is ignored**.
   - **After preprocessing `expr`, compare it with `ParamType` to determine `T`**.

   📌 **What does "compare" mean here?**  
   It may be hard to describe, but it's easy to understand through examples:

   - If `ParamType = T&` and `expr = const int`, then `T = const int`, so `ParamType = const int&`.
   - If `ParamType = const T&` and `expr = const int`, then `T = int`, so `ParamType = const int&`.
   - If `ParamType = T*` and `expr = int*`, then `T = int`, so `ParamType = int*`.

#### **3. `ParamType` is a Universal Reference (`T&&`)**
   - **If `expr` is an lvalue**, `T` and `ParamType` **are both deduced as lvalue references (`T&`)**.  
     This is **the only case where `T` is deduced as a reference**.
   - **If `expr` is an rvalue**, `T` is deduced based on a **comparison** with `ParamType`,  
     following the same deduction process as in regular references.

The **type deduction rules for `auto`** are almost identical to **template type deduction rules**.  
However, **uniform initialization (brace `{}` initialization) is an exception**:  
- When using `{}` initialization, `auto` **defaults to deducing `std::initializer_list`**.

Additionally, **when `auto` is used for lambda parameters and lambda return types**,  
it follows **template deduction rules** in some cases.

**C++14: Using `auto` for Function Return Type Deduction**
With this foundation, let's now look at how **C++14 introduced `auto` for deducing function return types**.
~~~cpp
string getStr(){ return string("123");}
string& getStrRef(){ 
   string* pStr = new string("456");
   return *pStr;
}

auto funcStrA(){
   return getStr();
}

auto funcStrB(){
   return getStrRef();
}
~~~
We expect `funcStrB` to return a **`std::string&`**, but instead, it returns a **`std::string`**.  

Why?  
Because **`auto` follows the same deduction rules as templates**,  
which means **it ignores reference qualifiers (`&`)**.

To solve this issue, **`decltype(auto)`** was introduced.
~~~cpp
decltype(auto) funcStrC(){
   return getStrRef();
}
decltype(auto) funcStrD(string&& str){
	return std::forward<string>(str);
}
~~~
The improved version `funcStrD` ensures that **regardless of whether `str` is an lvalue reference or an rvalue reference**,  
it will be **perfectly forwarded** to the return value.

#### **Generic Lambdas**

C++14 further extends **automatic type deduction** to **lambda parameters**.  
We know that **regular functions cannot use `auto` in parameters** (due to function overloading),  
but since **lambdas do not require overloading**, C++14 allows **lambda parameters to be automatically deduced**:
~~~cpp
auto add = [](auto a, auto b){
	return a + b;
};
cout<< add(1, 2)<< add(string("abc"), string("def"))<<endl;
~~~
A **mini version** of a template function? Yes! 🚀  
With **generic lambdas**, it's like having **a tiny template function** in a single expression.

---

### **Other Small Features in C++14**
The remaining **C++14 features** are relatively minor, including:

#### **Variable Templates**
Before C++14, templates could only be **function templates** or **class templates**.  
Now, **C++14 introduces variable templates**, which allow templates to be applied to **variables**.

##### **Example:**
```cpp
template<typename T>
T var;

var<int> a = 5;
var<std::string> b = "Hello";
```
### **C++17 Features**

C++17 introduces **more significant changes** compared to C++14.  
Here are some of the **major improvements**:

---

#### **Structured Bindings**

Let's first get an **intuitive understanding** of **structured bindings**.  
For example, in **C++11**, when working with **`std::tuple`**, unpacking values was somewhat cumbersome:  
~~~cpp
auto tup = make_tuple("123", 12, 7.0);
string str;
int i;
double d;
std::tie(str, i, d) = tup;

//C++17
auto [x,y,z] = tup;
~~~
Not only does **`std::tuple`** benefit from this feature,  
but **arrays, structs, and even classes** with **only public, non-static data members** can also take advantage of it!  

Check out the following example:
~~~cpp
double myArray[3] = { 1.0, 2.0, 3.0 };  
auto [a, b, c] = myArray;
auto& [ra, rb, rc] = myArray;
struct S { int x1 : 2; double y1; };
S f();
const auto [ x, y ] = f; //Note1：
~~~
**Note 1:** Some versions of the GCC compiler have bugs related to this feature.  
For details, see [here](https://stackoverflow.com/questions/53721714/why-does-structured-binding-not-work-as-expected-on-struct).  

Moreover, there are also some interesting tricks:
~~~cpp
std::map myMap;    
for (const auto & [k,v] : myMap) 
{  
    // k - key
    // v - value
} 
~~~

#### **`std::variant`**

If `std::tuple` can be considered an **extension of `struct`**,  
then `std::variant` is essentially an **extension of `union`**.
~~~cpp
std::variant<int, double, std::wstring> var{ 1.0 };
var = 1;
var = "str";
~~~
#### **Fold Expressions for Variadic Templates**

C++17 introduces a **powerful feature** that simplifies **variadic template** code significantly.  
Before C++17, in **C++11**, implementing a **multi-parameter accumulator** required the following approach:

~~~cpp
template<typename T>
auto myAdd(const T& a,const T& b){
    return a + b;
}
template<typename T, typename... RestT>
auto myAdd(const T& a, const RestT&... restArgs){
    return a + myAdd(restArgs...);
}
~~~
In **C++17**, we can achieve the same functionality with **a single template**:

~~~cpp
template<typename ...Args> 
auto myAddEx(const Args& ...args) { 
    return (args + ...); // The compiler will expand the expression as: `1 + (2 + (3 + 4))`
    //or
    return (... + args); // The compiler will expand the expression as: `((1 + 2) + 3) + 4`
    // For addition, the two expressions above are equivalent.  
    // However, for subtraction, they produce different results.  
    // Additionally, **parentheses cannot be omitted**.    
}
cout<<myAddEx(1,2,3,4)<<endl;
~~~

Not just addition—many other operators can also take advantage of this feature!  
But that's not all—**there are four types of fold expressions**:

| **Type**         | **Expression**        | **Expansion** |
|------------------|-----------------------|--------------------------------------------------|
| **Unary Right Fold** | `(pack op ...)` | `pack1 op (... op (packN-1 op packN))` |
| **Unary Left Fold**  | `(... op pack)` | `((pack1 op pack2) op ...) op packN` |
| **Binary Left Fold** | `(init op ... op pack)` | `(((init op pack1) op pack2) op ...) op packN` |
| **Binary Right Fold** | `(pack op ... op init)` | `pack1 op (... op (packN-1 op (packN op init)))` |

You can **remember the names** like this:  
If the **`...`** symbol appears **to the left of `pack`**, it's a **left fold**.

We have already seen **the first and second types** in `myAddEx`.  
Now, let's explore **the third and fourth types** with the following code:
~~~cpp
template<typename ...Args> 
auto weirdSub(const Args& ...args) { 
    return ( 1000 - ... - args ); // (((1000-1)-2)-3)-4 = 990
}

template<typename ...Args> 
auto weirdSub2(const Args& ...args) { 
    return ( args - ... - 1000 ); // 1-(2-(3-(4-1000))) = 998
}
cout<<weirdSub(1,2,3,4)<<endl; //990
cout<<weirdSub2(1,2,3,4)<<endl;//998

// Using this feature, we can implement a `print` function like this:  
// (Note the placement of parentheses)
template<typename ...Args>
void FoldPrint(Args&&... args) {
    (cout << ... << forward<Args>(args)) << '\n';
}
~~~
#### **`if constexpr`**

This is a **game-changer!** 🚀  

In **template metaprogramming**, we often use **template specialization, SFINAE, or `std::enable_if` (C++14)**  
to implement **conditional logic**.  

With **`if constexpr`**, things become **much simpler and cleaner**.

For example, in the past, implementing a **compile-time Fibonacci function** required:
~~~cpp
template<int  N>
constexpr int fibonacci() {return fibonacci<N-1>() + fibonacci<N-2>(); }
template<>
constexpr int fibonacci<1>() { return 1; }
template<>
constexpr int fibonacci<0>() { return 0; }
~~~
This example leverages **template specialization** to implement **compile-time `if-else` logic**.  
With **`if constexpr`**, the code becomes **much more concise**:
~~~cpp
template<int N>
constexpr int fibonacci(){
	if constexpr(N <= 1)
		return N;
	else
		return fibonacci<N-1>() + fibonacci<N-2>;
}
~~~
Developers who frequently write template-based code will **love** this improvement! 🚀  

---

#### **Class Template Argument Deduction (CTAD)**

In **earlier versions of C++**, function templates could be instantiated in two ways:  
- **Implicit instantiation**: The compiler **deduces** the type from arguments and **automatically** instantiates the function template.
- **Explicit instantiation**: The programmer **manually specifies** the type for the compiler to instantiate.

However, **class templates** only supported **explicit instantiation**—  
their **constructors did not support argument deduction**.

For example:
```cpp
std::pair<int, int> p(12, 3);

// To simplify this, the STL introduced the following function template:
auto p = std::make_pair(12, 3);

// Internally, `make_pair` essentially does this:
template<typename _T1, typename _T2>
inline pair<_T1, _T2> make_pair(_T1 __x, _T2 __y) { 
    return pair<_T1, _T2>(__x, __y); 
}

// It utilizes **function template argument deduction** to determine the type of `pair`.
// 🚀 After C++17, **class templates also support argument deduction**,  
// so the above code can be written like this:
std::pair p(10, 0.0);

// Or simply:
auto p = std::pair(1, 1);
```

With this improvement, many **`make_XXX` functions** in the STL are no longer needed,  
such as **`make_tuple`**, **`make_pair`**, etc.

#### **Using `auto` in Non-Type Template Parameters**

A **non-type template parameter** refers to scenarios like this:

```cpp
template<int N>
constexpr int fibonacci() { ... }

// With this feature, our Fibonacci function template can be written like this:
template<auto N>
constexpr int fibonacci() { ... }

// Invocation:
fibonacci<5>();
```
#### **Nested Namespace Definition**

A **syntactic improvement** in C++17.  
Previously, defining **nested namespaces** required this syntax:

~~~cpp
namespace X{
	namespace Y{
		namespace X{

		}
	}
}

//C++17:
namespace X::Y::Z{

}
~~~

#### **Initialization in `if`/`switch` Statements**

C++17 introduces a **convenient syntax improvement**,  
allowing **variable initialization directly inside `if` and `switch` statements**.

~~~cpp
if (auto p = getValue(); p==XXX) {   
    //...
} else {
    //...
~~~
Personally, this syntax feels **a bit unusual** at first.  
However, this improvement **restricts the scope** of `p` to the `if` statement,  
which can help avoid **unnecessary variable exposure**.

Consider the following example:
~~~cpp
const std::string myString = "My Hello World Wow";

const auto it = myString.find("Hello");
if (it != std::string::npos)
    std::cout << it << " Hello\n"

const auto it2 = myString.find("World");
if (it2 != std::string::npos)
    std::cout << it2 << " World\n"
    
//After C++17
if (const auto it = myString.find("Hello"); it != std::string::npos)
    std::cout << it << " Hello\n";

if (const auto it = myString.find("World"); it != std::string::npos)
    std::cout << it << " World\n";
~~~
#### **Inline Variables**

We are familiar with **inline functions**, where adding the `inline` keyword  
before a function definition allows the compiler to **inline** it—  
replacing function calls with the actual function body, eliminating call overhead.

In **C++17**, the `inline` keyword can now also be applied to **variables**:

~~~cpp
struct MyClass
{
    static const int sValue;
};

inline int const MyClass::sValue = 777;

struct MyClass2
{
    inline static const int sValue = 777;
};
~~~

### Summary

Overall, **C++17 introduces more significant changes than C++14**.  

**C++14** primarily **extended `auto` to function return types**, making type deduction more flexible.  
**C++17**, on the other hand, **greatly improved template metaprogramming**, with features such as: `if constexpr`, Fold expressions, `auto` in non-type template parameters, Class template argument deduction (CTAD). Additionally, **structured bindings** make working with **tuple-like structures** much more convenient.  

However, compared to **C++11**, both **C++14 and C++17** are relatively **minor updates**.  
The upcoming **C++20** is expected to bring **major changes**, including: **Concepts**, **Ranges**
**Contracts**, **Modules**, **Coroutines**, **Reflection**, **Executors**, **Networking**

Just thinking about it is **exciting!** 🚀
