---
layout: post
title: C++14与C++17新特性，你想知道的都在这
lang: zh-CN
---

### C++14篇
相对于C++11，C++14的改动可谓非常mini了，主要的改动一句话便是：扩大自动类型推断的应用范围。剩下的都是边边角角的小改动

这包括：
>* 函数返回值自动推断
>* 泛型lambda

<!--more--> 

#### 函数返回值推断
~~~cpp
//以前要这样：
int func(){
	return 10;
}
//C++14后可以这样
auto func(){
	return 10;
}
~~~
函数中假如有多条返回路径，则程序员要保证各条路径推断出的结果必须是一致的，否则会编译报错。
另外，C++14还加入一个风骚的东西：**decltype(auto)**。我们知道decltype是用来提取表达式的类型的，写个auto在里面，能提取什么东西出来？他与直接auto有啥区别呢？
首先得搞明白auto与decltype的细节与区别。
auto的推导规则基本源于C++模板的推导规则，先看下C++模板的推导规则：
~~~cpp
template<typename T>
void func(ParamType param){...}
func(expr);
//编译器根据expr的类型推导出T的类型以及ParamType的类型(很多时候ParamType的类型不等于T)
template<typename T>void funcA(T param){}
template<typename T>void funcB(T& param){}
template<typename T>void funcC(T* param){}
template<typename T>void funcD(T&& param){}

int x=1;
int& xr = x;
int* xp = &x;
const int xc = 4;
const int& xcr = x;
const int* xcp = &xc;

funcA(x);   //funcA<int>(int param)
funcA(xr);  //funcA<int>(int param)
funcA(xp);  //funcA<int*>(int* param)
funcA(xc);  //funcA<int>(int param)
funcA(xcr); //funcA<int>(int param)
funcA(xcp); //funcA<const int*>(const int* param)

funcB(x);   //funcB<int>(int& param);
funcB(xr);  //funcB<int>(int& param);
funcB(xp);  //funcB<int*>(int*& param);
funcB(xc);  //funcB<const int>(const int& param);
funcB(xcr); //funcB<const int>(const int& param);
funcB(xcp); //funcB<const int*>(const int*& param);
funcB(getObj());//编译不过(getObj返回一个右值)

funcC(x);   //编译不过
funcC(xp);  //编译不过
funcC(xp);  //func<int>(int* param)
funcC(xcp); //funcC<const int>(const int* param);

funcD(x);   //funcD<int&>(int& param);
funcD(xr);  //funcD<int&>(int& param);
funcD(xp);  //funcD<int*&>(int*& param);
funcD(xc);  //funcD<const int&>(const int& param);
funcD(xcr); //funcD<const int&>(const int& param);
funcD(xcp); //funcD<const int*&>(const int*& param);
funcD(getObj()); //funcD<A>(A&&)

~~~
我们把ParamType的划分成三种情况，来总结模板的类型推导规则。之后就可以用这些规则来解答上述代码中的T和ParamType了

>* ParamType既不是引用也不是指针(按值传递，编译器会复制一份expr传递给形参)
>   1.假如expr是个引用，则忽略引用的部分
>   2.假如expr有CV限定符（const和volatile），也忽略。特别的，如果expr是个指针，则指针指向的类型的CV限定符会被保留，指针本身的CV限定符会被忽略。
>* ParamType是一个普通引用或指针(普通引用是相对于通用引用而言)
>   1.假如expr是个引用，则忽略引用的部分
>   2.根据预处理后的expr的类型和ParamType <font color='red'> **对比**</font> ，确定T的类型。这里<font color='red'> **对比**</font> 的意思有点难以描述，但很容易理解: 假如ParamType = T& 而 expr = const int，则T=const int, ParamType = const int&。假如ParamType=const T& 而 expr=const int，则T=int， ParamType=const int&。假如ParamType=T*，expr=int*，则T=int，ParamType=int*
> * ParamType是一个通用引用（T&&）.
>   1.如果expr是一个左值，则T和ParamType都会被推导成左值引用，这是模板类型T被推导成引用的唯一情况。
>   2.如果expr是一个右值，则依然通过<font color='red'> **对比**</font>确定T的类型

auto的推导规则与模板的推导规则基本一模一样，统一初始化这种情形下的推导是例外。auto默认大括号初始化的类型是std::initializer_list。另外auto在推导lambda参数和lambda返回值的时候用的有事模板的推导规则。

有了上面的基础，我们再看C++14中新添加的用auto推导函数返回值的情况：
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
我们期望 funcStrB的返回值是一个string&类型，但是不是，funcStrB的类型是string，为啥呢？因为auto用的是模板的那一套规则，会把引用符忽略掉。
decltype(auto)就是用来解决这个场景的
~~~cpp
decltype(auto) funcStrC(){
   return getStrRef();
}
decltype(auto) funcStrD(string&& str){
	return std::forward<string>(str);
}
~~~
升级版的funcStrD，不管str是一个左值引用还是一个右值引用，都会完美返回给返回值。

#### 泛型lambda
C++14还将自动类型推断扩展到了lambda表达式的参数里，我们知道函数因为重载的原因，不能再参数里用auto（可以用模板实现想要的效果），但lambda无需重载，C++14里lambda的参数也能自动推断了：
~~~cpp
auto add = [](auto a, auto b){
	return a + b;
};
cout<< add(1, 2)<< add(string("abc"), string("def"))<<endl;
~~~
一个迷你版的模板函数有木有！
剩下的C++14特性都比较小，有：
####  变量模板
在C++之前的版本中，模板可以是函数模板或类模板，C++14现在也可以创建变量模板，他是下面这个样子
~~~cpp
template<typename T>
T var

var<int> a = 5;
var<string> b = 2.0;
....
~~~

###  C++17篇
C++17的动作幅度比C++14稍微大了点，重磅的改动以下几点：

#### 结构化绑定
先直观地看下啥是结构化绑定。例如在C++11中新推出的tuple元组，在解包的时候有点麻烦，我们得像这样来操作：
~~~cpp
auto tup = make_tuple("123", 12, 7.0);
string str;
int i;
double d;
std::tie(str, i, d) = tup;

//C++17一行搞定
auto [x,y,z] = tup;
~~~
不光是tuple能够蒙受恩泽，数组、结构体、全是public数据成员且没有static数据的类、统统雨露均沾！！！看如下代码:
~~~cpp
double myArray[3] = { 1.0, 2.0, 3.0 };  
auto [a, b, c] = myArray;
auto& [ra, rb, rc] = myArray;
struct S { int x1 : 2; double y1; };
S f();
const auto [ x, y ] = f; //备注1：
~~~
备注1：gcc版本的编译器对此项特性的支持有bug，详见[这里](https://stackoverflow.com/questions/53721714/why-does-structured-binding-not-work-as-expected-on-struct)
不仅如此，还有如下骚操作：
~~~cpp
std::map myMap;    
for (const auto & [k,v] : myMap) 
{  
    // k - key
    // v - value
} 
~~~

#### std::variant
tuple相当于struct的延伸，variant则是union的延伸
~~~cpp
std::variant<int, double, std::wstring> var{ 1.0 };
var = 1;
var = "str";
~~~
#### 用于可变参数模板的折叠表达式
有一个让代码变得简洁的大利器（用在可变参数模板中）
例如，在C++11中我们使用可变参数模板实现一个多参数累加器，要这么搞：
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
在C++17中，我们可以一个模板搞定
~~~cpp
template<typename ...Args> 
auto myAddEx(const Args& ...args) { 
    return (args + ...); //编译器会这样干：1+(2+(3+(4)))
    //或者
    return (... + args); //编译器会这样干：((1+2)+3)+4
    //对于加法上述两种表达是等效的，但是减法就不是了。另外，括号是不能省略的
}
cout<<myAddEx(1,2,3,4)<<endl;
~~~
不光加法，其他好多操作符也可以使用上述特性，这还不算啥，总共有4种折叠方式：
|名称|表达式|  展开式|
|--|--|--|
|一元右折叠| (pack op ...) | pack1 op (... op (packN-1 op packN)) |
一元左折叠| (... op pack) | ((pack1 op pack2) op ...) op packN |
|二元左折叠| (init op ... op pack) | (((init op pack1) op pack2) op ...) op packN |
|二元右折叠 | (pack op ... op init) | pack1 op (... op (packN-1 op (packN op init))) |

名称可以这样记：<font color='red'>**...**</font > 符号在pack的左边就是左折叠。

第一种第二种我们已经在myAddEx里体验过了，第三个第四看下面的代码：
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

//用此特性可以这样实现print函数：（注意括号的位置）
template<typename ...Args>
void FoldPrint(Args&&... args) {
    (cout << ... << forward<Args>(args)) << '\n';
}
~~~

#### if constexpr
这是个大杀器！
在模板元编程中，我们经常使用模板特化、SFINAE、C++14的 std::enable_if 等特性实现条件判断，有了if constexpr，就很爽了
例如，在以前，我们要实现一个编译期的fibonacci函数，需要这样：
~~~cpp
template<int  N>
constexpr int fibonacci() {return fibonacci<N-1>() + fibonacci<N-2>(); }
template<>
constexpr int fibonacci<1>() { return 1; }
template<>
constexpr int fibonacci<0>() { return 0; }
~~~
这个例子就是利用编译器对模板的特化来实现编译期的if else，有了if constexpr之后，代码就可以简洁多了：
~~~cpp
template<int N>
constexpr int fibonacci(){
	if constexpr(N <= 1)
		return N;
	else
		return fibonacci<N-1>() + fibonacci<N-2>;
}
~~~
那些经常用模板写代码的人估计要爱死这个改进了

####  类模板的实参推演
在之前版本的C++中，函数模板可以有显式实例化和隐式实例化两种实例化方式，隐式实例化，编译器会根据实参的类型，推导，然后自动实例化函数模板。而显式的则需程序员指定类型，来让编译器实例化。在类模板中，则只有显式实例化——类模板的构造函数不支持实参推演，例如：
~~~cpp
std::pair<int, int> p(12,3);
//为了方便，于是STL提供了下面这样的函数模板：
auto p = std::make_pair(12,3);
//实际上make_pair只是做了这样一件事：
template<typename _T1, typename _T2>
inline pair<_T1, _T2> make_pair(_T1 __x, _T2 __y){ 
	return pair<_T1, _T2>(__x, __y); 
}
//利用函数模板的实参推演，确定pair的类型
//C++17之后，类模板也支持实参推演了，上述代码就可以这样写了：
std::pair p(10, 0.0);
//或者
auto p = std::pair(1,1);
~~~
有了这个改进，STL中很多make_XXX都不需要了，比如make_tuple，make_pair。。。。
#### 在非类型模板形参中使用auto
所谓的“非类型类模板形参”是指这样的情况：
~~~cpp
template<int N>
constexpr int fibonacci(){...}
//有了这个特性，我们的fibonacci函数模板可以这样写了：
template<auto N>
constexpr int fibonacci(){...}
//调用：
fibonacci<5>();
~~~
#### 嵌套的namespace定义
一个语法层面的改进，之前定义嵌套的命名空间要这样：
~~~cpp
namespace X{
	namespace Y{
		namespace X{

		}
	}
}

C++17:
namespace X::Y::Z{

}
~~~
#### if/swtich语句内支持初始化
~~~cpp
if (auto p = getValue(); p==XXX) {   
    //...
} else {
    //...
~~~
个人感觉，读起来有点怪异。但是这种改进，使得p的作用域限制在了if语句的范围内，考虑如下代码：
~~~cpp
const std::string myString = "My Hello World Wow";

const auto it = myString.find("Hello");
if (it != std::string::npos)
    std::cout << it << " Hello\n"

const auto it2 = myString.find("World");
if (it2 != std::string::npos)
    std::cout << it2 << " World\n"
    
//C++17之后
if (const auto it = myString.find("Hello"); it != std::string::npos)
    std::cout << it << " Hello\n";

if (const auto it = myString.find("World"); it != std::string::npos)
    std::cout << it << " World\n";
~~~
#### 内联变量
我们知道内联函数：在函数定义前面加上inline关键字，编译器会根据情况，将函数处理成内联，在调用的地方直接替换，省去一次函数调用的开销。在C++17中，inline关键字也可以用来修饰变量了：
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

### 总结
总体上讲，C++17的改动要大于C++14，C++14将auto的作用范围扩展到了函数返回值，而C++17则极大地改进了模板元编程（if constexpr、折叠表达式、非类型模板参数支持auto、类模板实参推演等等），同时结构化绑定也大大方便了类tuple语意的使用。这两者相对C++11来看，都只能算小改动了，即将到来的C++20应该会有个大动作吧，concept、range、contract、module、coroutine、reflection、executor、networking。。。。。想想都鸡动啊